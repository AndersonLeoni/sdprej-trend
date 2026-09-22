# Painel SDPREJ

Painel de acompanhamento dos itens de prejuízo do projeto **SDPREJ** no Jira da CVC.
O entregável é **um arquivo HTML único e autocontido**, que abre offline por cópia simples,
sem servidor e sem dependência externa. Este repositório guarda as peças; o `build.js` monta.

Três visões sobre o mesmo universo de 1.513 chamados (o filtro salvo `10478`):

| Visão | Recorte | Responde |
|---|---|---|
| **Por tema** | a fila de `análise área responsável` | onde o prejuízo se concentra e o que está velho |
| **Por analista** | histórico (changelog) do universo inteiro | quem analisou o quê, e o que está parado na conferência |
| **Vínculo com GDIS** | universo inteiro | este prejuízo tem chamado de TI, e em que pé ele está |

## ⚠️ O que não pode ser comitado

Os payloads extraídos contêm **valor de prejuízo, nome de colaborador com métrica
individual de produtividade (LGPD), razão social de cliente e de fornecedor**.

`data/` e `dist/` estão no `.gitignore` **desde o primeiro commit**. Isso não é
formalidade: uma vez comitado, o dado fica no histórico do Git para sempre, e apagar
o arquivo depois **não resolve** — só reescrita de histórico resolve, e aí toda cópia
já distribuída continua tendo. O repositório é privado, e continua sendo.

O token do Jira também não entra em arquivo nenhum: ele vem de variável de ambiente.

## Instalação

Precisa de **Node 18 ou mais novo** e nada mais — zero dependências de npm, nenhum
`npm install`. Confira com `node --version`.

```
git clone <url-do-repo>
cd sdprej-painel
copy config.example.json config.json
```

Edite `config.json` se o filtro ou a instância mudarem. Depois, uma vez só, grave a
credencial na sua conta de usuário do Windows:

```
setx JIRA_EMAIL "seu.email@cvccorp.com.br"
setx JIRA_TOKEN "cole-o-token-aqui"
```

O token é gerado em <https://id.atlassian.com/manage-profile/security/api-tokens>.
**Abra um terminal novo depois do `setx`** — a variável não aparece no que já estava aberto.

### Na rede corporativa: duas pedras no caminho

Nenhuma das duas é problema do projeto, mas as duas custam tempo se ninguém avisar.

**`winget` está desativado por política de grupo** (`EnableAppInstaller: 0`), então
`winget install Git.Git` sai com código 58. A saída é o **MinGit**: zip puro, sem
instalador e sem administrador, extraído em `%LOCALAPPDATA%\Programs\MinGit`, com
`...\MinGit\cmd` no PATH do usuário.

**O TLS é interceptado por uma CA corporativa**, e a consulta de revogação do
certificado dela não é alcançável — todo `git fetch`/`push` morre com
`CRYPT_E_NO_REVOCATION_CHECK`. Uma vez por clone:

```
git config http.sslBackend schannel
git config http.schannelCheckRevoke false
```

As duas linhas juntas, na ordem: a segunda só tem efeito com o backend declarado
explicitamente na primeira. O backend `openssl` **não** é alternativa aqui — ele usa o
bundle Mozilla, que não conhece a CA corporativa, e falha com `unable to get local
issuer certificate`. Só o schannel enxerga o repositório de certificados do Windows.

## Uso

```
run-all.cmd                  extrai, monta e confere
node extract/run.js          só extrai       -> data/*.json
node extract/run.js temas    só uma visão (a de changelog é a demorada, ~40 s)
node build.js                só monta        -> dist/SDPREJ_Painel.html
node verify.js               só confere      (não fala com o Jira)
```

Para atualizar todo dia automaticamente:

```
agendar.cmd            tarefa diária às 08:10
agendar.cmd 07:30      em outro horário
agendar.cmd /remover
```

A tarefa roda no contexto do usuário, sem privilégio de administrador — logo, **só
dispara com o usuário logado**. O log fica em `data/run.log`.

Para publicar o painel pronto em outra pasta além de `dist/`, preencha `saida` no
`config.json`. Serve para pasta do Teams, OneDrive ou SharePoint sincronizado; nenhum
código muda.

> **Limitação a saber antes de escolher o destino:** HTML servido de SharePoint ou
> Teams é **baixado, não renderizado** — a biblioteca de documentos desativa script.
> Quem abrir vai baixar e abrir local, que é o fluxo de hoje, só automático e sempre
> fresco. Renderizar dentro do tenant exige exceção de um administrador do SharePoint.

## Estrutura

```
src/template.html      cabeçalho + marcação das 3 visões + marcadores @@...@@
src/app.css            estilo
src/app.js             render, filtros, ordenação, exportação CSV
extract/jira.js        transporte: auth, paginação, retentativa em 429/5xx
extract/derive.js      regras de derivação (tema, aging, valor, área, baldes de GDIS)
extract/aggregate.js   agrupamento, top-N com "Outros", KPIs
extract/temas.js       monta o payload DT
extract/analistas.js   monta o payload DA (changelog)
extract/gdis.js        monta o payload GD (colunar)
extract/run.js         orquestra os três        -> data/*.json
build.js               junta tudo               -> dist/SDPREJ_Painel.html
verify.js              recalcula e confere o que está em data/
data/                  payloads          (IGNORADO pelo git)
dist/                  painel montado    (IGNORADO pelo git)
```

`extract/derive.js` e `extract/aggregate.js` são JavaScript puro, sem I/O e sem
dependência, de propósito: é o mesmo código que roda num resolver do Forge se o app
for adiante.

## Decisões que não são óbvias no código

**Por que Node e não PowerShell.** A política de execução efetiva desta máquina é
`Restricted` por GPO de domínio, e arquivo `.ps1` não executa. A lógica precisava sair
do PowerShell. Os `.cmd` existem porque o Agendador roda `.cmd` sem restrição.

**Uma passada, um carimbo.** `run.js` extrai as três visões no mesmo instante e usa o
mesmo `geradoEm` nas três. Na versão montada à mão isso não acontecia, e a mesma etapa
aparecia com 652 chamados numa visão e 647 em outra. O `build.js` só escreve a nota de
deriva no rodapé **quando os carimbos realmente diferem** — texto fixo viraria mentira
na primeira extração limpa.

**O filtro salvo é a fonte autoritativa.** Não troque `filter in ("10478")` por um JQL
escrito à mão: um JQL aparentemente equivalente devolve 5.928 chamados contra 1.509,
porque omite a cláusula `status in (...)` que o filtro carrega.

**Desempate no top-N.** O ranking desempata por valor decrescente, depois por nome. A
versão antiga não desempatava: o `Sort-Object` do Windows PowerShell 5.1 não é estável,
então entre categorias de contagem igual a ordem saía do quicksort do .NET. Isso era
invisível num gráfico mas não no corte do top-N — cinco fornecedores empatados em 3
chamados disputavam as últimas vagas, e quais entravam mudava o valor somado em "Outros"
de uma execução para outra, sem que nenhum chamado tivesse mudado.

**Agrupamento sem distinção de caixa.** `groupBy` normaliza a caixa antes de agrupar,
como o `Group-Object` faz por padrão. Fornecedor tem 520 grafias distintas byte a byte,
mas 514 fornecedores.

**Mediana pelo central superior.** Em lista par usamos `v[n/2]`, não a média dos dois
centrais. Mantido para não criar um degrau na série histórica do KPI sem que nenhum
chamado tenha mudado — e o valor exibido é sempre um prejuízo que existe de verdade.

**`areaFalha` guarda o sufixo ` - prejuízo`; as trocas de área não.** Na tabela é o
nome do campo do Jira, e o usuário reconhece assim. Em "de X para Y" o sufixo seria
ruído repetido duas vezes na mesma frase.

**O vínculo com GDIS é texto livre.** `customfield_10973` aceita qualquer conteúdo, e
`issuelinks` está vazio em todos os 1.513 chamados — não existe segunda fonte. Então a
bagunça é tratada como dado, não como erro: chave válida, chave de outro projeto, texto
livre e campo em branco são quatro categorias visíveis no painel.

**O payload de GDIS é colunar.** 1.513 objetos com oito chaves nomeadas custariam
~180 KB só de nome de campo repetido; com dicionário de strings e array posicional o
mesmo dado cabe em 67 KB.

## Defeitos conhecidos no dado (não no código)

- **A troca de área tem três campos parecidos, e só um serve.** `customfield_11054`
  ("Área identificadora") é o estado **atual**, usado pela visão por tema — ele não
  aparece nenhuma vez no changelog. `customfield_10975` ("Área responsável") tem 1.501
  mudanças, mas todas são `vazio → X` feitas por "Automation for Jira": é preenchimento,
  não troca. O histórico de troca está em **`customfield_10885`** ("Departamento
  responsável"): 485 mudanças, todas de X para Y, 9 autores humanos, 17 áreas.
  `customfield_11008` ("Justificativa troca área responsável") é texto livre **por
  definição** — é a justificativa escrita por quem trocou, não um nome de área.
- **Uma área não segue o padrão do sufixo.** As outras 16 terminam em `- prejuízo` e o
  `limpaArea` remove; "Fraude Prejuízo" não tem hífen separando, então fica como está e
  o `verify.js` emite nota. Preferi a nota a adivinhar onde o nome termina.
- **Auto-transição de status.** O fluxo tem transição que volta ao mesmo status, e o Jira
  registra `análise área responsável → análise área responsável` como mudança. São 1.419
  das 2.373 saídas aparentes daquela etapa. Contar isso como ciclo inflava a produtividade
  em 2,5×.
- **Caixa inconsistente no catálogo de status do GDIS** — "Em análise Nível 1",
  "Em análise nível 2", "Em Análise Nível 3". A classificação é insensível a caixa.
- **Uma chave GDIS referenciada que não existe mais** no Jira. Aparece como
  *GDIS informado não localizado*, de propósito: perder o vínculo é uma informação.

## Conferência

`node verify.js` não fala com o Jira — recalcula tudo o que pode a partir de `data/` e
compara. Ele separa dois tipos de diferença que não podem ser confundidos: **erro de
conta** (categoria com contagem ou valor diferente, sempre FALHA) e **efeito de
desempate** (o corte do top-N caiu em categorias diferentes, que é nota). Confere também
que as oito agregações particionam o total exatamente, que os baldes de GDIS somam o
universo, e as invariantes do dia de referência.
