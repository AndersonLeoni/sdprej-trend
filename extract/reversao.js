'use strict';
/**
 * reversao.js — monta o payload RV (quanto do prejuizo e revertido e quanto entra de fato).
 *
 * Universo: TODOS os chamados do departamento TI/Fraude (encerrados + em aberto),
 * a mesma JQL_BASE da tela de SLA. A reversao so se mede com o ciclo completo:
 * o backlog ativo quase nao tem credito recebido (a reversao acontece depois).
 *
 * Por chamado (regra em derive.reversao):
 *     inicial = revertido + efetivo
 * O "credito recebido" e o dado primario da reversao; "Prejuizo apos Reversao" e
 * usado quando existe, mas nao e confiavel sozinho (veja o comentario la).
 *
 * Formato COLUNAR (um array por chamado + dicionarios), como GD: 6 mil chamados
 * com chaves repetidas pesariam ~1,5 MB a mais no painel.
 *   rows[i] = [keyNum, aberto(1/0), tema, produto, area, fornecedor, ano,
 *              inicial, revertido, oficial, tentativas(-1 = vazio), parecer, qualidade]
 */

const jira = require('./jira');
const D = require('./derive');
const A = require('./aggregate');
const { JQL_BASE } = require('./encerrados');

const CAMPOS = [
  'key', 'summary', 'created', 'status',
  D.CAMPO.valorFinal, D.CAMPO.valorInicial, D.CAMPO.credito, D.CAMPO.tentativas, D.CAMPO.parecerArea,
  D.CAMPO.areaFalha, D.CAMPO.fornecedor, D.CAMPO.reversaoSN, D.CAMPO.categoriaPrej,
];

function dicionario(padrao) {
  const mapa = new Map(), lista = [];
  if (padrao !== undefined) { mapa.set('', 0); lista.push(padrao); }
  return {
    lista,
    id(v) {
      const k = String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, 70);
      if (!mapa.has(k)) { mapa.set(k, lista.length); lista.push(k); }
      return mapa.get(k);
    },
  };
}

async function montar(cfg, agora = new Date()) {
  const issues = await jira.buscar(JQL_BASE, CAMPOS, { rotulo: 'reversao' });

  const temas = dicionario(), prods = dicionario(), areas = dicionario('Não informada'), forns = dicionario('Não informado');
  const rows = issues.map(it => {
    const f = it.fields;
    const r = D.reversao(f);
    const tentTxt = D.valorDe(f[D.CAMPO.tentativas]);        // '' quando vazio — Number('') seria 0, e 0 e um valor valido
    const tent = tentTxt === '' ? NaN : Number(tentTxt);
    return [
      Number(it.key.split('-')[1]),
      f.status && f.status.statusCategory && f.status.statusCategory.key === 'done' ? 0 : 1,
      temas.id(D.tema(f.summary)),
      prods.id(D.produto(f.summary)),
      areas.id(D.limpaArea(D.valorDe(f[D.CAMPO.areaFalha]))),
      forns.id(D.valorDe(f[D.CAMPO.fornecedor])),
      Number(String(f.created).slice(0, 4)),
      r.inicial, r.revertido, r.oficial,
      Number.isFinite(tent) ? tent : -1,
      D.classificaParecer(D.adfTexto(f[D.CAMPO.parecerArea])),
      r.qualidade,
    ];
  });

  const col = i => rows.map(r => r[i]);
  return {
    geradoEm: D.carimbo(agora),
    universo: JQL_BASE,
    kpis: {
      total: rows.length,
      abertos: rows.filter(r => r[1]).length,
      inicial: A.soma(col(7)),
      revertido: A.soma(col(8)),
      oficial: A.soma(col(9)),
      /* campos do formulario que existem para registrar a reversao: quantos chamados os preencheram */
      preenchidos: {
        reversaoSN: issues.filter(it => D.valorDe(it.fields[D.CAMPO.reversaoSN])).length,
        categoriaPrej: issues.filter(it => D.valorDe(it.fields[D.CAMPO.categoriaPrej])).length,
        tentativas: rows.filter(r => r[10] >= 0).length,
        parecer: rows.filter(r => r[11] > 0).length,
      },
    },
    dic: { temas: temas.lista, prods: prods.lista, areas: areas.lista, forns: forns.lista, pareceres: D.PARECER },
    rows,
  };
}

module.exports = { montar, CAMPOS };
