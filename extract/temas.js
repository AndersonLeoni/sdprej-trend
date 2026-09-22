'use strict';
/**
 * temas.js — monta o payload DT (visao por tema).
 *
 * Recorte: a fila de "analise area responsavel" dentro do universo do filtro.
 * Uma consulta so; as oito agregacoes saem todas de issues[], nao de consultas
 * separadas — e por isso que todas fecham exatamente no mesmo total.
 */

const jira = require('./jira');
const D = require('./derive');
const A = require('./aggregate');

const ETAPA = 'análise área responsável';

const CAMPOS = [
  'key', 'summary', 'created', 'status',
  D.CAMPO.problema, D.CAMPO.falha, D.CAMPO.valorFinal, D.CAMPO.valorInicial,
  D.CAMPO.fornecedor, D.CAMPO.cliente, D.CAMPO.areaFalha, D.CAMPO.ocorrencia,
];

async function montar(cfg, agora = new Date()) {
  const jql = `${cfg.universo} AND status = "${ETAPA}"`;
  const issues = await jira.buscar(jql, CAMPOS, { rotulo: 'temas' });

  /* --- uma passada: tudo o que o painel mostra por chamado --------------- */
  const lista = issues.map(it => {
    const f = it.fields;
    return {
      key: it.key,
      summary: f.summary || '',
      created: D.soData(f.created),
      diasAberto: D.diasAberto(f.created, agora.getTime()),
      temaDerivado: D.tema(f.summary),
      /* areaFalha fica com o sufixo " - prejuizo" AQUI de proposito: e o nome
         do campo do Jira e o usuario reconhece assim na tabela. Na visao de
         analistas, onde a area aparece em troca de area ("de X para Y"), o
         sufixo e removido — ali ele seria ruido repetido. */
      areaFalha: D.valorDe(f[D.CAMPO.areaFalha]),
      falha: D.valorDe(f[D.CAMPO.falha]),
      valor: A.arredonda(D.valor(f)),
      fornecedor: D.valorDe(f[D.CAMPO.fornecedor]),
      cliente: D.valorDe(f[D.CAMPO.cliente]),
      ocorrencia: D.valorDe(f[D.CAMPO.ocorrencia]),
      /* problema nao vai para issues[]: e usado so na agregacao. A tabela do
         painel nao tem coluna para ele, e sao ~60 caracteres por chamado que
         nao seriam lidos por ninguem — 652 vezes isso e peso morto no arquivo. */
      _problema: D.valorDe(f[D.CAMPO.problema]),
    };
  });

  const val = i => i.valor;
  const vs = lista.map(val);
  const ds = lista.map(i => i.diasAberto);

  return {
    geradoEm: D.carimbo(agora),
    kpis: {
      total: lista.length,
      valorTotal: A.soma(vs),
      valorMediana: A.mediana(vs),
      valorMax: A.maximo(vs),
      acima180d: lista.filter(i => i.diasAberto > 180).length,
      maisAntigo: ds.length ? Math.max(...ds) : 0,
      idadeMedia: ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : 0,
    },
    /* ranking: colapsa no limite de cada agregacao */
    temas:      A.agregar(lista, i => i.temaDerivado, val, A.LIMITE.temas),
    problema:   A.agregar(lista, i => i._problema,    val, A.LIMITE.problema),
    falha:      A.agregar(lista, i => i.falha,        val, A.LIMITE.falha),
    areaFalha:  A.agregar(lista, i => i.areaFalha,    val, A.LIMITE.areaFalha),
    /* escala e serie: ordem declarada, nunca por contagem */
    aging:      A.agregarEmOrdem(lista, i => D.faixaAging(i.diasAberto), val, D.FAIXAS_ORDEM),
    mensal:     A.agregarEmOrdem(lista, i => D.mes(i.created),           val, null),
    /* cauda longa: 500+ fornecedores e 350+ clientes, limite mais alto */
    fornecedor: A.agregar(lista, i => i.fornecedor, val, A.LIMITE.fornecedor),
    cliente:    A.agregar(lista, i => i.cliente,    val, A.LIMITE.cliente),
    issues: lista.map(({ _problema, ...resto }) => resto),
  };
}

module.exports = { montar, ETAPA, CAMPOS };
