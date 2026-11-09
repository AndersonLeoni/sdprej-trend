# Painel SDPREJ

Painel de acompanhamento dos itens de prejuízo do projeto **SDPREJ** no Jira da CVC.
O entregável é **um arquivo HTML único e autocontido**, que abre offline por cópia simples,
sem servidor e sem dependência externa. Este repositório guarda as peças; o `build.js` monta.

Cinco visões. As quatro primeiras compartilham o mesmo universo de backlog ativo — o filtro salvo
`10478` (~1.565 chamados, só status em aberto); a quinta é um universo próprio, complementar:

| Visão | Recorte | Responde |
|---|---|---|
| **Por tema** (visão geral) | as 3 etapas com a TI: `análise área responsável`, `Aprovação diretoria`, `Conferência supervisão/gerência` — filtro **Etapa** na tela | onde o prejuízo se concentra e o que está velho |
| **Por analista** | histórico (changelog) do universo inteiro | quem analisou o quê, e o que está parado na conferência |
| **Vínculo com GDIS** | universo inteiro | este prejuízo tem chamado de TI, e em que pé ele está |
| **Ciclo de correção** | reagregação do payload de GDIS, por problema | de aberto a corrigido, quanto prejuízo cada fase ainda segura |
| **Histórico encerrado** | mesmo projeto/tipo, `statusCategory = Done` (~4.454) | o que já foi resolvido/baixado — fora dos KPIs do backlog ativo de propósito |
| **Fila de atuação** | os chamados da etapa `análise área responsável` (o filtro `10478` nessa etapa, ~680) | o que está pendente de tratativa da TI, em ordem de prioridade, para os analistas trabalharem |

A **Fila de atuação** (sexta opção do menu) não tem extração própria: sai do mesmo payload da visão geral, acrescido do campo
`updated` do Jira (dias sem movimentação). Confere chave a chave com o filtro no Jira. A **prioridade sugerida** é uma regra simples
e declarada na tela, não um dado do Jira: chamados com **GDIS já encerrado** primeiro (a causa técnica foi tratada; hoje ~63% da fila),
depois os mais antigos. O painel é uma fotografia da última extração, então a tela traz o botão **Abrir fila ao vivo no Jira**, além de
**Copiar chaves** e **Copiar JQL** (`key in (…)`) do que está filtrado, na ordem da tela. O responsável do Jira **não** é usado: quase
nenhum chamado da fila tem assignee (a fila é compartilhada e cada analista pega o chamado na hora).

O filtro `10478` exclui por definição qualquer status encerrado (confirmado lendo a JQL completa do
filtro pela API) — não é um corte de data, é de status. Por isso o histórico de anos anteriores
(inclusive casos de 2020 e antes) só aparece na visão **Histórico encerrado**, nunca nas outras quatro:
somar valor de um caso já resolvido ao "prejuízo em aberto" distorceria a leitura da gerência.

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
node extract/run.js temas    só uma visão (a de changelog é a demorada, ~40 s; a de encerrados tem ~4.500 chamados, ~25 s)
node build.js                só monta        -> dist/SDPREJ_Painel.html
node verify.js               só confere      (não fala com o Jira)
```

### Tela de SLA do ciclo (separada, só local por enquanto)

```
run-sla.cmd                  extrai todos os chamados (abertos + encerrados) e monta dist\SLA_Painel.html
node extract/sla.js          só extrai       -> data/sla.json
node build-sla.js            só monta        -> dist/SLA_Painel.html
```

Tela à parte do painel de prejuízo, no mesmo visual, para validação. **Não entra no `build.js` nem no
fluxo do GitHub** — publicar é uma decisão posterior. Tem duas abas, cada uma com uma **meta em dias
editável na própria tela**, em todo o período:

- **Tempo de atuação** (abre primeiro): estimativa de quanto tempo alguém **trabalhou** em cada prejuízo, que é
  diferente do tempo corrido (este inclui a espera: um chamado espera meses e é tratado em minutos). O Jira não
  registra esforço, então são dois sinais, escolhidos na tela: o **ritmo entre ações** (minutos desde a ação anterior
  do mesmo analista em outro chamado, dentro da mesma sessão de até 30 min — cobre ~83% da história, mediana ~6 min)
  e as **horas apontadas** (lançamentos de horas do Tempo dentro da passagem — só desde ago/2026, em blocos de 15 min,
  mediana ~30 min). Os dois discordam (o apontado é tipicamente ~5× o ritmo nas mesmas entregas) e **a realidade deve ficar
  entre eles**: o apontado inclui trabalho fora do Jira; o ritmo não enxerga entregas isoladas, então tende a subestimar.
  Entregas em lote (outra ação no mesmo minuto) não medem esforço. Uma entrega sem sinal fica **sem estimativa**, nunca
  com um valor inventado.
- **Tratativa (tempo corrido)** (meta padrão 30 dias): o tempo que a TI leva para atender cada
  SDPREJ — da entrada do chamado na etapa `análise área responsável` até o analista entregá-lo à
  `Conferência supervisão/gerência`, atribuído a quem entregou. Cada passagem é uma tratativa; o chamado que
  volta da conferência gera uma nova (um *retorno*). Depois da entrega o prazo deixa de ser da TI.
- **Capacidade por dia**: quantos SDPREJs a TI trata (entrega à conferência) por dia no ritmo **observado**
  numa janela (30 a 365 dias, úteis ou corridos), contra quantos chegam por dia — chegada é a entrada na análise,
  chamado novo ou retorno. Responde "quando a fila zera": fila de hoje ÷ (entregas − chegadas por dia), e qual
  ritmo seria preciso para zerá-la num prazo escolhido. O resultado muda muito com a janela (em 2026-11, nos
  últimos 30 dias entram mais do que saem; nos 90, sobra um pouco; nos 365, entra mais de novo), e a capacidade
  recente está concentrada em poucos analistas. Capacidade aqui é ritmo, não limite: não desconta feriados,
  férias nem entregas em lote.
- **Ciclo do chamado** (meta padrão 90 dias): dias corridos entre a **abertura** e o **encerramento** (data de
  resolução) do chamado inteiro, incluindo as etapas que não são da TI.

A extração leva ~3 min porque lê o histórico de status dos ~6.000 chamados (`extract/tratativa.js`).
A tratativa **inclui a espera na fila** antes de alguém pegar o chamado e atribui ao analista **quem moveu
o chamado**: se um gestor entrega em lote, a conta cai nele. Separar "espera" de "execução" pediria o
histórico de atribuição (`assignee`). A aba de tratativa mostra produtividade individual com nome (LGPD).

A meta é parâmetro, não dado do Jira: os campos de SLA de prejuízo (`SLA PREJ COMERCIAL`,
`SLA PREJ POS-TRAVEL`, `Time to resolution`) estão vazios nos 6.027 chamados e o Service Desk não devolve
SLA para eles — por isso o SLA é calculado. Se a empresa tiver metas formais (talvez uma por área, como os
nomes dos campos sugerem), a meta única vira uma tabela por área.

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
src/template.html      cabeçalho + marcação das 5 visões + marcadores @@...@@
src/app.css            estilo (compartilhado com a tela de SLA e o painel Trend)
src/shared.js          gráficos (barras, rosca, área), menu lateral, KPIs animados — usado pelas duas telas
src/app.js             render, filtros, ordenação, exportação CSV do painel de prejuízo
src/sla.template.html  tela de SLA do ciclo (separada)
src/sla.js             cálculo e render do SLA, no navegador (a meta é editável)
src/assets/            logo da CVC (PNG transparente, embutido em base64 no HTML)
build-lib.js           peças comuns dos montadores (logo em base64)
build-sla.js           monta a tela de SLA     -> dist/SLA_Painel.html
extract/sla.js         monta o payload do SLA  -> data/sla.json
extract/tratativa.js   passagens de um chamado pela etapa de análise (regra pura, com o histórico de status)
extract/jira.js        transporte: auth, paginação, retentativa em 429/5xx
extract/derive.js      regras de derivação (tema, produto, tipo, aging, valor, área, baldes de GDIS)
extract/aggregate.js   agrupamento, top-N com "Outros", KPIs
extract/temas.js       monta o payload DT
extract/analistas.js   monta o payload DA (changelog)
extract/gdis.js        monta o payload GD (colunar)
extract/encerrados.js  monta o payload HE (universo próprio, statusCategory = Done)
extract/run.js         orquestra os quatro      -> data/*.json
build.js               junta tudo               -> dist/SDPREJ_Painel.html
verify.js              recalcula e confere o que está em data/
data/                  payloads          (IGNORADO pelo git)
dist/                  painel montado    (IGNORADO pelo git)
```

`extract/derive.js` e `extract/aggregate.js` são JavaScript puro, sem I/O e sem
dependência, de propósito: é o mesmo código que roda num resolver do Forge se o app
for adiante.

## Decisões que não são óbvias no código

**Cores: marca na interface, tons validados nos gráficos.** As cores vieram dos sites oficiais
(Trend: azul `#0b6db5`, amarelo `#ffd500`; CVC: índigo `#0a00b4`, amarelo `#ffe600`, lavanda
`#dddbff`). A faixa do topo, as abas, os links e os selos usam a marca pura. As cores de *série* dos
gráficos não: o validador de paleta reprova o índigo puro (escuro demais para ser cor de série) e,
no tema escuro, o amarelo e o ciano da marca (claros demais). Os gráficos usam tons da mesma
família, validados nos dois temas. Tudo fica em variáveis no topo de `src/app.css`.

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
