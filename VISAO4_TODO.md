# Visão 4 — Ciclo de correção do problema

**Status:** ✅ IMPLEMENTADA (29/09/2026)

---

## O que ela responde

A pergunta do "de → para": cada chamado de TI (GDIS) que originou prejuízo está em que fase, e
quanto prejuízo aquela fase ainda segura.

A unidade é o **problema** (um GDIS), não o chamado de prejuízo. Um problema pode responder por
vários SDPREJ — por isso os totais desta visão não fecham com os das outras três, e a tela diz isso.

### Números da extração de 29/09/2026

| Fase | Problemas |
|---|---|
| Aberto / pendente | 6 |
| Em correção · Nível 1 | 93 |
| Em correção · Nível 2 | 3 |
| Em correção · Nível 3 | 17 |
| Aguardando validação do usuário | 13 |
| Corrigido | 1.050 |
| GDIS não localizado | 1 |
| **Total rastreado** | **1.183** |

- **88,8% dos problemas já foram corrigidos**
- Prejuízo destravado (problema corrigido): **R$ 2.856.283**
- Prejuízo retido (problema em aberto): **R$ 256.241** em 207 chamados
- O Nível 3 concentra 17 problemas e R$ 25.573 — é o gargalo

Os dois valores somam R$ 3.112.524, que é o total do universo. Conferido.

---

## Decisão de projeto que importa: zero consulta nova ao Jira

A primeira tentativa criou um `extract/problemas.js` que varria os projetos GDIS e SUST e, para cada
problema, fazia outra consulta buscando os SDPREJ vinculados. Isso estourou o limite de paginação do
`jira.buscar` (200 chamadas) e travou a rotina.

**O erro era de premissa.** O payload `GD`, que a visão "Vínculo com GDIS" já usa, contém:

- a chave do GDIS (`rows[i][5]`)
- o **status real** daquele GDIS, lido no próprio Jira na extração (`rows[i][7]` → `gsts`)
- o balde já classificado (`rows[i][6]`)
- o valor e a idade de cada SDPREJ

Ou seja: o dado do "de → para" já estava extraído. A Visão 4 é uma **reagregação de `GI`** em memória,
agrupando por GDIS em vez de por chamado. Custo: zero chamadas, zero segundos.

`extract/problemas.js` foi removido. Não recriar.

### Sobre SUST

Verificado nos dados: **zero chaves SUST** no campo `nº ocorrência` dos 1.513 chamados. O balde de
"chave de outro projeto" tem 6 registros, e são `CNT-`, `SDTTI-` e `DIS-`. Na prática o vínculo é só
GDIS, então não houve necessidade de alargar o padrão `GDIS-nnnn`.

Se SUST passar a aparecer, o ajuste é em `extract/derive.js`: trocar `RE_GDIS` por
`/^(GDIS|SUST)-\d+$/`. Isso muda os números da visão de GDIS também, porque esses registros saem de
"Sem vínculo rastreável".

---

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/template.html` | aba `tab-rel` + seção `view-rel` |
| `src/app.js` | `RFASE`, `RI` (reagregação) e o módulo `ViewRel` |
| `generate-relatorio-problemas.js` | tabelas do relatório para o Confluence, lendo `data/gdis.json` |
| `publish-relatorio.js` | publica a página "SDPREJ — Ciclo de Correção do Problema" |
| `atualizar-confluence.cmd` | passos 3b (gerar) e 7 (publicar) |

---

## O que a visão tem

- **6 KPIs:** problemas rastreados, já corrigidos, em correção, no Nível 3, prejuízo retido,
  prejuízo destravado
- **Funil das fases** na ordem real do fluxo, alternável entre contagem e valor
- **Escalonamento em curso** (N1/N2/N3) com nota sobre o peso do Nível 3
- **Temas com problema ainda aberto**
- **Fila de correção por prioridade de valor** — os 12 problemas que seguram mais prejuízo, com os
  SDPREJ vinculados clicáveis. É a lista acionável: corrigir o topo destrava mais valor
- **Tabela completa** ordenável por qualquer coluna, com CSV
- **Filtros:** fase, tema predominante, busca livre

---

## Verificação feita

Renderizado em Chrome headless com os dados reais, conferindo o DOM resultante:

- 6 KPIs com os números corretos
- 18 barras nos três gráficos (7 + 3 + 8)
- 112 linhas de tabela preenchidas
- 21 opções de filtro populadas
- Rodapé: "Exibindo 100 de 1.183 problemas · 1.399 SDPREJ vinculados · soma R$ 3.112.524,80"
- Nenhum `undefined` ou `NaN` no conteúdo
- `node --check` limpo em `app.js`
- Acentuação correta no arquivo compilado, sem BOM

---

## Próximos passos (não bloqueiam nada)

1. **Botão de imprimir por gráfico** — o pedido original de print. O CSS já tem uma regra
   `@media print` que esconde controles; falta o botão por card e o isolamento do card na impressão.
2. **Histórico do ciclo** — hoje a visão é uma fotografia. Guardar a contagem por fase a cada
   extração permitiria mostrar a curva de correção ao longo do tempo. Exige persistir um
   `data/historico.json` acumulado (e decidir onde ele vive, já que `data/` não é versionado).
3. **Tempo de permanência por fase** — o changelog do GDIS diria quanto tempo cada problema passou
   em cada nível. Custa uma extração de changelog nova (~40 s), então só vale se a pergunta aparecer.
