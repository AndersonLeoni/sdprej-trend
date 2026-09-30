# 📊 SDPREJ — Relatório de Status — Pausa Pré-Férias

**Última atualização:** 30 de setembro de 2026
**Status:** ✅ Pronto para apresentação — desenvolvimento pausado até a volta das férias (02/10/2026)

---

## 1. O que o projeto entrega hoje

Um painel interativo com **quatro visões**, alimentado por extração automática do Jira, publicado
em dois lugares com finalidades diferentes:

```
1. TEMAS            — distribuição por padrão derivado, top 10 por valor, aging
2. VÍNCULO COM GDIS  — rastreamento de incidente, escalonamento N1/N2/N3
3. POR ANALISTA      — ciclos concluídos, ritmo, fila de supervisão, 180+ dias
4. CICLO DE CORREÇÃO — "de → para": cada GDIS aberto, em correção ou já corrigido,
                        e quanto prejuízo cada fase ainda segura (adicionada em 29-30/09)
```

| Publicação | Conteúdo | Atualização | Motivo da separação |
|---|---|---|---|
| **GitHub Pages** (`andersonleoni.github.io/sdprej-trend`) | Painel completo, as 4 visões | Automática, seg-sex 8h (GitHub Actions) | Confluence tem allowlist de IP que bloqueia o runner do GitHub (403) |
| **Confluence** (`PNCT` / DASHBOARD SDPREJ TREND) | KPIs + tabelas + resumo das 4 visões + link para o painel | Manual, `atualizar-confluence.cmd` | Precisa rodar da máquina corporativa, que tem acesso liberado |

## 2. Execução até agora — linha do tempo

### Estrutura e automação (25–28/09)
- Código separado de dado (`src/`, `extract/`) — payloads em `data/`, nunca versionados
- `extract/run.js` reescrito em Node puro, sem depender de PowerShell (a GPO bloqueia `.ps1`)
- GitHub Actions publicando o painel em GitHub Pages, seg-sex às 8h (UTC-3)
- Rotina local `atualizar-confluence.cmd` cobrindo o que a Action não alcança: publicar no Confluence
- Bugs de BOM (`config.json` com marca UTF-8 da PowerShell) corrigidos em todos os scripts que leem config

### Visão 4 — Ciclo de correção (29–30/09)
- Pedido da gerência: um "de → para" dos GDIS/SUST que originam os prejuízos, mostrando o que já foi
  corrigido, o que está em correção (com destaque pro Nível 3) e o que está parado
- **Decisão de projeto que evitou trabalho e custo desnecessários:** a primeira tentativa criava uma
  extração nova por problema e estourava o limite de paginação do Jira. O dado certo já estava no
  payload `GD` (usado pela visão de GDIS) — a Visão 4 é só uma reagregação em memória, sem nenhuma
  chamada nova ao Jira. Detalhe completo em `VISAO4_TODO.md`
- Números da extração de 29/09: 1.183 problemas rastreados, 88,8% corrigidos, R$ 2.856.283
  destravados vs. R$ 256.241 ainda retidos, gargalo de 17 problemas no Nível 3
- Resumo da visão publicado também na página índice do Confluence (não só no painel)

### Segurança — Fase 1 e 2 do roteiro (30/09)
Tratado como prática deliberada de arquitetura segura (primeiro projeto grande do responsável),
não como resposta a incidente — feito em fases pequenas e verificadas uma a uma:

| Item | Status |
|---|---|
| Secret scanning + Push Protection | ✅ Ativo, 0 segredos detectados |
| Dependabot alerts (vulnerabilidade) | ✅ Ativo, 0 alertas abertos |
| Dependabot version updates (GitHub Actions) | ✅ `.github/dependabot.yml`, semanal |
| Code scanning (CodeQL) | ✅ Ativo |
| Private vulnerability reporting | ✅ Ativo |
| Security policy | ✅ `SECURITY.md` publicado |
| Branch protection na `main` | ✅ Exige PR + Action verde |
| Descoberta por buscador do painel público | ✅ `robots.txt` + `<meta noindex>` |
| Permissões do workflow | ✅ Documentadas — só `contents:write` + `pages:write` |

## 3. Pontos em aberto, conscientes e não resolvidos por decisão

Isso não é dívida técnica esquecida — é o que foi discutido e explicitamente adiado para a volta:

- **O repositório é público**, e o GitHub Pages publica o painel completo sem autenticação —
  incluindo nome de analista com métrica individual de produtividade (LGPD) e razão social de
  cliente/fornecedor. Decisão registrada como **provisória**, válida só para o período de
  apresentação. Detalhe e opções já mapeadas em memória (`sdprej-exposicao-publica`).
- **`package.json` não é zero-dependência** como um relatório anterior registrou — tem `puppeteer` e
  `form-data`, usados em `upload-screenshots.js`. Não é problema de segurança (0 alertas do
  Dependabot), é só uma imprecisão a corrigir na próxima vez que esse script for tocado.
- **Dependabot cobre GitHub Actions, não ainda o ecossistema npm** (`puppeteer`/`form-data`) — hoje
  o Dependabot *alerts* já cobre os dois (é escopo automático), só o *version update* (PR
  automático) ficou restrito a Actions. Fácil de estender, ficou fora do escopo combinado hoje.
- **MCPs mapeados, nenhum instalado ainda:** GitHub MCP (prioridade 1 — resolve a fricção de eu não
  ter `gh`/token nesta máquina), Atlassian Remote MCP (prioridade 2 — Confluence/Jira direto na
  sessão), Playwright MCP (prioridade 3 — substitui o hack de `chrome --headless --dump-dom`). Os
  três são gratuitos, usam credencial que já existe. Ficou para decidir instalar na volta.

## 4. Melhorias já em mente (ditas nas conversas, ainda não feitas)

1. **Botão de imprimir por gráfico** — pedido original de exportação; falta o botão por card e
   isolar o card no `@media print` que já existe no CSS.
2. **Histórico do ciclo de correção** — a Visão 4 hoje é uma fotografia. Guardar a contagem por fase
   a cada extração mostraria a curva de correção ao longo do tempo (exige decidir onde um
   `data/historico.json` acumulado vive, já que `data/` não é versionado).
3. **Tempo de permanência por fase** — precisaria do changelog do GDIS (~40s de extração extra);
   só vale a pena se a pergunta realmente aparecer.
4. **Fase 3 de segurança** — anonimizar nome de analista no build público, mantendo nome completo só
   no Confluence (atrás do SSO). Você decidiu manter como está por agora.
5. **Decisão de arquitetura de hospedagem** — repo privado (perde Pages no plano Free), painel como
   anexo do Confluence (atrás do SSO, sem allowlist para GitHub Actions resolver), ou build público
   anonimizado em paralelo ao completo.

## 5. Especulação — melhorias que ainda não foram ditas, mas fazem sentido pela conversa

Ideias que surgem naturalmente do que já foi construído e discutido, para avaliar na volta — nenhuma
delas foi pedida ainda, são sugestões:

- **Runner self-hosted na máquina corporativa.** Hoje a separação Pages/Confluence existe porque o
  runner do GitHub não passa pelo allowlist do Confluence. Um runner self-hosted instalado nesta
  máquina resolveria isso na raiz: a mesma Action que hoje só publica no Pages passaria a publicar
  também no Confluence, no mesmo agendamento — acabando com a dependência de você clicar no
  `atualizar-confluence.cmd`. Custo: o runner só executa enquanto a máquina estiver ligada e com o
  serviço ativo, o que num notebook corporativo pode não ser sempre.
- **Alerta proativo de gargalo.** A Visão 4 já identifica o que está "parado" (Nível 3, dias em
  aberto). Um passo natural é notificar quando esse número cresce — por e-mail ou Teams — em vez de
  depender de alguém abrir o painel para notar.
- **Assinatura de commits (`git commit -S` / verified commits).** Complementa a branch protection já
  ativa; garante que um commit na `main` é provadamente seu, não só "autorizado por PR".
- **Revisar o primeiro resultado do CodeQL.** Ele acabou de ser ativado hoje — a primeira varredura
  ainda não rodou. Vale abrir a aba de alertas na volta para ver se ele achou algo nos scripts de
  geração de HTML (é exatamente a classe de código, concatenação de string em massa, onde esse tipo
  de ferramenta costuma achar algo real).
- **Monitorar o aparecimento de SUST.** Hoje zero chaves SUST existem no dado (só GDIS). Se isso
  mudar, o ajuste é conhecido e pontual (`extract/derive.js`, regex `RE_GDIS`) — vale só fazer
  quando precisar, não antes.
- **Migração para app Forge** (dado ao vivo, botão de atualizar real) continua sendo o horizonte mais
  distante — depende de um admin do Jira instalar o app, fora do seu controle direto.

## 6. Onde retomar

1. Ler este arquivo + `VISAO4_TODO.md` (detalhe técnico da Visão 4) +
   `.claude/plans/eager-foraging-dragonfly.md` (roteiro de segurança, Fase 3 pendente)
2. Decidir a arquitetura de hospedagem (item 3/4 acima) — é a decisão que trava as outras de LGPD
3. Escolher se instala os MCPs (item 3) — baixo custo, ajuda a partir daí
4. Seguir pela lista de melhorias já mapeadas (seção 4) na ordem que fizer sentido pro próximo ciclo

---

**Projeto:** SDPREJ · **Responsável:** Anderson Leoni · **Repositório:**
`github.com/AndersonLeoni/sdprej-trend`
