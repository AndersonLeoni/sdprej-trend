#!/usr/bin/env node
/**
 * verify.js — confere as regras de derivacao contra os payloads em data/.
 *
 * Nao fala com o Jira e nao precisa de token: le o dado que ja esta em disco e
 * recalcula tudo o que pode ser recalculado. Serve para dois momentos:
 *
 *  - depois de mexer em derive.js ou aggregate.js, para ver se algum numero do
 *    painel se moveu sem que nenhum chamado tenha mudado;
 *  - depois de uma extracao nova, como checagem de sanidade das invariantes.
 *
 * Uso:  node verify.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const D = require('./extract/derive');
const A = require('./extract/aggregate');

const RAIZ = __dirname;
const ler = f => JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', f), 'utf8'));

let falhas = 0, avisos = 0;
const ok    = m => console.log('  ok    ' + m);
const falha = m => { falhas++; console.log('  FALHA ' + m); };
const aviso = m => { avisos++; console.log('  nota  ' + m); };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* -------------------------------------------------------- visao por tema -- */

function verificaTemas(DT) {
  console.log('\nvisao por tema (' + DT.issues.length + ' chamados, extraida em ' + DT.geradoEm + ')');
  const it = DT.issues, val = i => i.valor;

  /* As oito agregacoes precisam PARTICIONAR issues[]: se alguma nao fechar no
     total, ou o filtro perdeu chamado ou uma categoria esta contando duas vezes.
     E a checagem que pega erro de agregacao mais rapido. */
  for (const nome of ['temas', 'problema', 'falha', 'areaFalha', 'aging', 'mensal', 'fornecedor', 'cliente']) {
    const g = DT[nome];
    const c = g.reduce((s, x) => s + x.count, 0);
    const v = A.arredonda(g.reduce((s, x) => s + x.valor, 0));
    if (c !== it.length) falha(`${nome}: soma ${c}, esperado ${it.length}`);
    else if (v !== DT.kpis.valorTotal) falha(`${nome}: valor ${v}, esperado ${DT.kpis.valorTotal}`);
    else ok(`${nome} particiona ${c} chamados e R$ ${v.toLocaleString('pt-BR')}`);
  }

  /* Recalculo das agregacoes que saem inteiramente de issues[]. 'problema' fica
     de fora: ele existe so como agregacao, o campo nao e guardado por chamado. */
  const casos = [
    ['temas',      A.agregar(it, i => i.temaDerivado, val, A.LIMITE.temas)],
    ['falha',      A.agregar(it, i => i.falha,        val, A.LIMITE.falha)],
    ['areaFalha',  A.agregar(it, i => i.areaFalha,    val, A.LIMITE.areaFalha)],
    ['fornecedor', A.agregar(it, i => i.fornecedor,   val, A.LIMITE.fornecedor)],
    ['cliente',    A.agregar(it, i => i.cliente,      val, A.LIMITE.cliente)],
    ['aging',      A.agregarEmOrdem(it, i => D.faixaAging(i.diasAberto), val, D.FAIXAS_ORDEM)],
    ['mensal',     A.agregarEmOrdem(it, i => D.mes(i.created), val, null)],
  ];
  for (const [nome, calc] of casos) compara(nome, calc, DT[nome]);

  /* Tema recalculado do resumo: e a regra mais mexida, e a que mais quebra. */
  const dif = it.filter(i => D.tema(i.summary) !== i.temaDerivado);
  if (!dif.length) ok('tema recalcula identico nos ' + it.length + ' resumos');
  else {
    const pares = {};
    dif.forEach(i => { const k = i.temaDerivado + '  ->  ' + D.tema(i.summary); pares[k] = (pares[k] || 0) + 1; });
    aviso('tema mudou em ' + dif.length + ' de ' + it.length + ' chamados:');
    Object.entries(pares).sort((a, b) => b[1] - a[1])
      .forEach(([k, n]) => console.log('          ' + String(n).padStart(4) + 'x  ' + k));
  }

  /* KPIs */
  const vs = it.map(val), ds = it.map(i => i.diasAberto);
  const k = {
    total: it.length, valorTotal: A.soma(vs), valorMediana: A.mediana(vs), valorMax: A.maximo(vs),
    acima180d: it.filter(i => i.diasAberto > 180).length,
    maisAntigo: Math.max(...ds),
    idadeMedia: Math.round(ds.reduce((a, b) => a + b, 0) / ds.length),
  };
  for (const c of Object.keys(DT.kpis)) {
    if (k[c] === DT.kpis[c]) ok('kpi ' + c + ' = ' + k[c]);
    else falha('kpi ' + c + ': calc ' + k[c] + ', esperado ' + DT.kpis[c]);
  }
}

/* --------------------------------------------------------- vinculo GDIS --- */

function verificaGdis(GD) {
  console.log('\nvinculo com GDIS (' + GD.rows.length + ' chamados, extraido em ' + GD.geradoEm + ')');

  /* Cada status do catalogo tem de cair num balde, e a classificacao do texto
     do campo tem de bater com o balde gravado. Isto e o que garante que as
     cinco faixas do painel somam o universo inteiro. */
  let difBalde = 0, difTipo = 0;
  const semClasse = new Set();
  for (const r of GD.rows) {
    const [, , , , , bruto, balde, gi] = r;
    const gstat = gi >= 0 ? GD.gsts[gi] : '';
    const tipo = D.classificaOcorrencia(bruto);
    const esperado = tipo === 'gdis' ? D.baldeStatus(gstat) : tipo;
    if (esperado !== balde) {
      /* chave valida sem status encontrado: o balde correto e 'nf' */
      if (!(tipo === 'gdis' && !gstat && balde === 'nf')) difBalde++;
    }
    if (tipo === 'gdis' && gi < 0 && balde !== 'nf') difTipo++;
    if (!D.CLASSE[balde]) semClasse.add(balde);
  }
  difBalde ? falha('balde divergiu em ' + difBalde + ' linhas') : ok('balde recalcula identico nas ' + GD.rows.length + ' linhas');
  difTipo  ? falha('chave valida sem status fora do balde nf em ' + difTipo + ' linhas') : ok('chaves sem status estao no balde nf');
  semClasse.size ? falha('balde sem classe no painel: ' + [...semClasse].join(', ')) : ok('todo balde tem classe de exibicao');

  for (const s of GD.gsts) {
    const b = D.baldeStatus(s);
    if (b === 'pen' && !/ABERTO|PENDENTE|A CONCLUIR/.test(D.normaliza(s))) {
      aviso(`status "${s}" caiu no balde pendente por falta de regra propria`);
    }
  }

  /* Invariantes do universo, do plano. */
  const tot = GD.rows.length;
  const comChave = GD.rows.filter(r => D.classificaOcorrencia(r[5]) === 'gdis').length;
  const distintos = new Set(GD.rows.filter(r => D.classificaOcorrencia(r[5]) === 'gdis').map(r => r[5])).size;
  const valor = A.soma(GD.rows.map(r => r[3]));
  conf('total do universo', tot, 1513);
  conf('chamados com chave GDIS', comChave, 1420);
  conf('GDIS distintos', distintos, 1199);
  conf('valor do universo', valor, 3523834.79);

  /* As cinco classes do painel precisam somar o universo. */
  const porClasse = {};
  GD.rows.forEach(r => { const c = D.CLASSE[r[6]] || '?'; porClasse[c] = (porClasse[c] || 0) + 1; });
  const soma = Object.values(porClasse).reduce((a, b) => a + b, 0);
  soma === tot ? ok('as classes particionam ' + tot + ': ' + JSON.stringify(porClasse))
               : falha('classes somam ' + soma + ', esperado ' + tot);
}

/**
 * Compara uma agregacao recalculada com a gravada, separando DOIS tipos de
 * diferenca que nao podem ser confundidos:
 *
 *  - erro de conta: uma categoria que existe nos dois lados com contagem ou
 *    valor diferente. Isso e FALHA, sempre.
 *  - efeito de desempate: o corte do top-N caiu em categorias diferentes
 *    porque havia empate de contagem na fronteira. Nao e erro — o painel
 *    antigo nao tinha desempate deterministico nenhum (Sort-Object do
 *    PowerShell 5.1 nao e estavel). E nota, e vale ver a lista.
 */
function compara(nome, calc, esp) {
  if (igual(calc, esp)) { ok(nome + ' recalcula identico'); return; }

  const eOutros = g => /^Outros \(\d+ categoria/.test(g.name);
  const mapa = g => new Map(g.filter(x => !eOutros(x)).map(x => [x.name, x]));
  const mc = mapa(calc), me = mapa(esp);

  let erro = false;
  for (const [n, a] of mc) {
    const b = me.get(n);
    if (b && (a.count !== b.count || a.valor !== b.valor)) {
      falha(`${nome}: "${n}" calc ${a.count}/${a.valor}, esperado ${b.count}/${b.valor}`);
      erro = true;
    }
  }

  const entraram = [...mc.keys()].filter(n => !me.has(n));
  const sairam   = [...me.keys()].filter(n => !mc.has(n));

  const oc = calc.find(eOutros), oe = esp.find(eOutros);
  if (oc && oe && oc.count !== oe.count) {
    falha(`${nome}: "Outros" tem ${oc.count} chamados, esperado ${oe.count}`);
    erro = true;
  }
  if (erro) return;

  if (!entraram.length && !sairam.length) {
    aviso(nome + ': mesmas categorias, ordem de empate diferente');
    return;
  }
  aviso(`${nome}: o corte do top-N caiu diferente por desempate de contagem`);
  entraram.forEach(n => console.log('          entrou  ' + n + '  (R$ ' + mc.get(n).valor.toLocaleString('pt-BR') + ')'));
  sairam.forEach(n   => console.log('          saiu    ' + n + '  (R$ ' + me.get(n).valor.toLocaleString('pt-BR') + ')'));
  if (oc && oe && oc.valor !== oe.valor) {
    console.log('          "Outros" muda de R$ ' + oe.valor.toLocaleString('pt-BR') +
                ' para R$ ' + oc.valor.toLocaleString('pt-BR') + ' por consequencia');
  }
}

function conf(rot, obtido, esperado) {
  if (obtido === esperado) ok(rot + ' = ' + obtido);
  /* Diferenca aqui nao e necessariamente bug: o universo muda de verdade a cada
     dia. O numero de referencia e a foto de 2026-09-22. */
  else aviso(rot + ' = ' + obtido + ' (referencia de 2026-09-22: ' + esperado + ')');
}

/* ----------------------------------------------------- visao por analista - */

function verificaAnalistas(DA) {
  console.log('\nvisao por analista (extraida em ' + DA.geradoEm + ')');

  const soma = DA.statusAtual.reduce((s, x) => s + x.count, 0);
  soma === DA.totalFiltro ? ok('statusAtual particiona ' + soma + ' chamados')
                          : falha('statusAtual soma ' + soma + ', totalFiltro ' + DA.totalFiltro);

  const naFila = DA.statusAtual.find(s => /Confer/i.test(s.name));
  if (naFila) {
    naFila.count === DA.fila.length
      ? ok('fila tem ' + DA.fila.length + ' itens, igual ao status "' + naFila.name + '"')
      : falha('fila tem ' + DA.fila.length + ', status "' + naFila.name + '" tem ' + naFila.count);
  }

  const dupFila = DA.fila.length - new Set(DA.fila.map(f => f.key)).size;
  dupFila ? falha(dupFila + ' chave repetida na fila') : ok('nenhuma chave repetida na fila');

  /* O campo de area aceita texto livre, e ha comentario colado dentro dele.
     Se sobrou paragrafo aqui, o grafico de trocas de area ganha categoria
     que e uma frase inteira — defeito conhecido do painel antigo. */
  const { areaValida } = require('./extract/analistas');
  const sujos = DA.areas.filter(a => !areaValida(a.de) || !areaValida(a.para));
  sujos.length
    ? aviso(sujos.length + ' de ' + DA.areas.length + ' trocas de area com texto livre no lugar do nome da area')
    : ok('as ' + DA.areas.length + ' trocas de area tem nome de area valido');

  const areas = new Set(DA.areas.flatMap(a => [a.de, a.para]).filter(areaValida));
  ok(areas.size + ' areas distintas em uso');
  ok(new Set(DA.ciclos.map(c => c.analista)).size + ' analistas com ciclo concluido, ' +
     DA.ciclos.length + ' ciclos em ' + new Set(DA.ciclos.map(c => c.key)).size + ' chamados');
}

/* -------------------------------------------------------------- main ------ */

function main() {
  const arqs = { temas: 'temas.json', analistas: 'analistas.json', gdis: 'gdis.json' };
  const faltando = Object.values(arqs).filter(f => !fs.existsSync(path.join(RAIZ, 'data', f)));
  if (faltando.length) {
    console.error('Faltam payloads em data/: ' + faltando.join(', '));
    console.error('Rode  node extract/run.js  primeiro.');
    process.exit(1);
  }

  verificaTemas(ler(arqs.temas));
  verificaGdis(ler(arqs.gdis));
  verificaAnalistas(ler(arqs.analistas));

  console.log('\n' + (falhas ? falhas + ' FALHA(S)' : 'nenhuma falha') +
              (avisos ? ', ' + avisos + ' nota(s)' : ''));
  process.exit(falhas ? 1 : 0);
}

main();
