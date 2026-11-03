'use strict';
/**
 * gdis.js — monta o payload GD (vinculo SDPREJ x GDIS).
 *
 * Duas coisas distinguem esta visao das outras:
 *
 * 1. Ela cobre o universo INTEIRO (1.513), nao uma etapa. E a visao que
 *    responde "este prejuizo tem chamado de TI, e em que pe ele esta".
 *
 * 2. O payload e COLUNAR, nao uma lista de objetos. 1.513 objetos com dez
 *    chaves nomeadas custariam bem mais so de nome de campo repetido; com
 *    dicionario de strings e array posicional o mesmo dado cabe num arquivo
 *    muito menor.
 *    O formato e: rows[i] = [keyNum, stIdx, temaIdx, prodIdx, valor, dias,
 *    mes, ocorrencia, balde, gstsIdx], com stIdx/temaIdx/prodIdx/gstsIdx
 *    apontando para sts/temas/prods/gsts.
 */

const jira = require('./jira');
const D = require('./derive');
const A = require('./aggregate');

const CAMPOS = [
  'key', 'summary', 'created', 'status',
  D.CAMPO.valorFinal, D.CAMPO.valorInicial, D.CAMPO.ocorrencia,
];

/** Dicionario por ordem de primeira aparicao. Devolve o indice. */
function dicionario() {
  const idx = new Map();
  const lista = [];
  return {
    lista,
    id(v) {
      if (v == null || v === '') return -1;
      let i = idx.get(v);
      if (i === undefined) { i = lista.push(v) - 1; idx.set(v, i); }
      return i;
    },
  };
}

async function montar(cfg, agora = new Date()) {
  const issues = await jira.buscar(cfg.universo, CAMPOS, { rotulo: 'gdis' });

  /* --- 1a passada: le o campo de ocorrencia e junta as chaves de GDIS ----- */
  const base = issues.map(it => {
    const f = it.fields;
    const bruto = String(D.valorDe(f[D.CAMPO.ocorrencia]) || '').trim();
    return {
      key: it.key,
      status: D.valorDe(f.status),
      tema: D.tema(f.summary),
      produto: D.produto(f.summary),
      valor: A.arredonda(D.valor(f)),
      dias: D.diasAberto(f.created, agora.getTime()),
      mes: D.mes(f.created),
      bruto,
      tipo: D.classificaOcorrencia(bruto),
    };
  });

  const chaves = [...new Set(base.filter(r => r.tipo === 'gdis').map(r => r.bruto))];
  console.error(`  gdis: ${base.filter(r => r.tipo === 'gdis').length} referencias, ${chaves.length} chamados distintos`);

  /* --- status real de cada GDIS ------------------------------------------ */
  const achados = chaves.length
    ? await jira.porChaves(chaves, ['key', 'status'], { rotulo: 'status dos GDIS' })
    : [];
  const statusGdis = new Map(achados.map(it => [it.key, D.valorDe(it.fields.status)]));

  const perdidos = chaves.length - statusGdis.size;
  if (perdidos > 0) {
    console.error(`  gdis: ${perdidos} chave(s) referenciada(s) que nao existe(m) mais no Jira`);
  }

  /* --- 2a passada: monta as linhas colunares ----------------------------- */
  const sts = dicionario();
  const temas = dicionario();
  const prods = dicionario();
  const gsts = dicionario();

  /* Esquema de rows[i], nesta ordem:
       [keyNum, stIdx, temaIdx, prodIdx, valor, dias, mes, bruto, balde, gstsIdx]
     Colunas produto/mes foram acrescentadas depois do lancamento original
     (que tinha so 8 colunas) — verify.js e a montagem de GI em src/app.js leem
     por indice e precisam ser atualizados juntos quando este esquema mudar. */
  const rows = base.map(r => {
    /* O status do GDIS so existe quando ha chave valida E ela foi encontrada.
       Quando a chave e valida mas nao existe mais, o balde e 'nf' — perder o
       vinculo e uma informacao, nao um erro a esconder. */
    const gs = r.tipo === 'gdis' ? (statusGdis.get(r.bruto) || '') : '';
    const balde = r.tipo === 'gdis' ? D.baldeStatus(gs) : r.tipo;
    return [
      Number(r.key.split('-')[1]),   // so o numero: o prefixo SDPREJ- e igual em 1.513 linhas
      sts.id(r.status),
      temas.id(r.tema),
      prods.id(r.produto),
      r.valor,
      r.dias,
      r.mes,
      r.bruto,                        // texto CRU, inclusive o que nao e chave
      balde,
      gsts.id(gs),                    // -1 quando nao ha status de GDIS
    ];
  });

  return {
    geradoEm: D.carimbo(agora),
    sts: sts.lista,
    temas: temas.lista,
    prods: prods.lista,
    gsts: gsts.lista,
    rows,
  };
}

module.exports = { montar, dicionario, CAMPOS };
