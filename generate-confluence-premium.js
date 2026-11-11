#!/usr/bin/env node
/**
 * generate-confluence-premium.js — página SDPREJ do Confluence
 *
 * Espelha a "Visão geral" do painel: todos os chamados do filtro TI nas TRÊS etapas
 * (análise área responsável, Aprovação diretoria, Conferência supervisão/gerência).
 * Mesmos números do painel, porque lê o mesmo data/temas.json.
 *
 * Visual: só macros nativas do Confluence (panel, section/column, status, toc, expand).
 * CSS customizado não sobrevive ao editor do Confluence, então nada depende dele.
 * O HTML gerado precisa ser XHTML válido (veja valida-xhtml.js).
 *
 * Uso: node generate-confluence-premium.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const PAINEL_URL = 'https://AndersonLeoni.github.io/sdprej-trend/'; // ajuste se o painel mudar de endereço
const JIRA = 'https://cvccorp.atlassian.net';
const JQL_FILA = 'filter in ("10478") AND project = SDPREJ AND status = "análise área responsável"';
const ETAPAS = ['análise área responsável', 'Aprovação diretoria', 'Conferência supervisão/gerência'];
const ETAPA_COR = { 'análise área responsável': 'Blue', 'Aprovação diretoria': 'Yellow', 'Conferência supervisão/gerência': 'Green' };

const rd = f => JSON.parse(fs.readFileSync(path.join(__dirname, 'data', f), 'utf8'));
const DT = rd('temas.json');
const DA = rd('analistas.json');
const GD = rd('gdis.json');

/* ---------- formatação ---------- */
const nfBRL = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
const nfInt = v => new Intl.NumberFormat('pt-BR').format(Math.round(v));
const pc = (a, b) => (b ? (a / b * 100).toFixed(1).replace('.', ',') + '%' : '0%');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const soma = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
const bar = p => '█'.repeat(Math.max(1, Math.round(p * 20)));      // barra de dados em texto
const link = k => `<a href="${JIRA}/browse/${esc(k)}"><strong>${esc(k)}</strong></a>`;
const dataBR = s => { const m = /^(\d{4})-(\d\d)-(\d\d)(?: (\d\d:\d\d))?/.exec(s || ''); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}` : s; };

/* ---------- blocos de layout (macros nativas) ---------- */
const lozenge = (txt, cor) => `<ac:structured-macro ac:name="status"><ac:parameter ac:name="colour">${cor}</ac:parameter><ac:parameter ac:name="title">${esc(txt)}</ac:parameter></ac:structured-macro>`;
const painel = (corpo, borda, fundo) => `<ac:structured-macro ac:name="panel"><ac:parameter ac:name="borderColor">${borda}</ac:parameter><ac:parameter ac:name="bgColor">${fundo}</ac:parameter><ac:rich-text-body>${corpo}</ac:rich-text-body></ac:structured-macro>`;
const TOM = {
  azul:    ['#0B5FA5', '#E8F1FA'], amarelo: ['#C9A400', '#FFF8D6'], vermelho: ['#C62828', '#FDECEC'],
  verde:   ['#2E7D32', '#E9F5EA'], cinza:   ['#8A94A6', '#F4F6F9'],
};
const card = (rotulo, valor, legenda, tom) => painel(
  `<p style="text-align: center;"><strong>${esc(rotulo.toUpperCase())}</strong></p>` +
  `<h3 style="text-align: center;">${esc(valor)}</h3>` +
  `<p style="text-align: center;">${esc(legenda)}</p>`, ...TOM[tom]);
const colunas = (itens) => `<ac:structured-macro ac:name="section"><ac:rich-text-body>${itens.map(c =>
  `<ac:structured-macro ac:name="column"><ac:parameter ac:name="width">${(100 / itens.length).toFixed(1)}%</ac:parameter><ac:rich-text-body>${c}</ac:rich-text-body></ac:structured-macro>`).join('')}</ac:rich-text-body></ac:structured-macro>`;
const tabela = (cab, linhas) => `<table><tbody><tr>${cab.map(c => `<th>${c}</th>`).join('')}</tr>${linhas.map(l => `<tr>${l.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const dir = h => `<p style="text-align: right;">${h}</p>`;
const expande = (titulo, corpo) => `<ac:structured-macro ac:name="expand"><ac:parameter ac:name="title">${esc(titulo)}</ac:parameter><ac:rich-text-body>${corpo}</ac:rich-text-body></ac:structured-macro>`;
const aviso = (titulo, corpo, tipo = 'info') => `<ac:structured-macro ac:name="${tipo}"><ac:parameter ac:name="title">${esc(titulo)}</ac:parameter><ac:rich-text-body>${corpo}</ac:rich-text-body></ac:structured-macro>`;

/* ---------- números (mesma fonte da Visão geral) ---------- */
const K = DT.kpis, I = DT.issues;
const T = K.total, V = K.valorTotal;
const porEtapa = ETAPAS.map(e => {
  const g = I.filter(i => i.status === e);
  return { nome: e, n: g.length, v: soma(g, i => i.valor), a180: g.filter(i => i.diasAberto > 180).length,
           idade: g.length ? soma(g, i => i.diasAberto) / g.length : 0 };
});
const fila = I.filter(i => i.status === ETAPAS[0]);

/* ---------- GDIS / ciclo de correção (mesma lógica das visões do painel) ---------- */
const FASE_LBL = { pen: 'Aberto / pendente', n1: 'Em correção · Nível 1', n2: 'Em correção · Nível 2', n3: 'Em correção · Nível 3',
                   usr: 'Aguardando validação do usuário', fim: 'Corrigido', nf: 'GDIS não localizado' };
const FASE_ORDEM = ['pen', 'n1', 'n2', 'n3', 'usr', 'fim', 'nf'];
const FASE_COR = { pen: 'Yellow', n1: 'Blue', n2: 'Blue', n3: 'Red', usr: 'Yellow', fim: 'Green', nf: 'Grey' };
const DE_BALDE = { pen: 'pen', n1: 'n1', n2: 'n2', n3: 'n3', usr: 'usr', res: 'fim', can: 'fim', des: 'fim', nf: 'nf' };

const faseDaChave = new Map();                       // SDPREJ-n -> fase do GDIS vinculado
const problemas = (() => {
  const m = new Map();
  for (const r of GD.rows) {
    faseDaChave.set('SDPREJ-' + r[0], DE_BALDE[r[8]] || 'nf');
    const chave = String(r[7] || '').trim();
    if (!/^GDIS-\d+$/.test(chave)) continue;
    let e = m.get(chave);
    if (!e) { e = { gdis: chave, fase: DE_BALDE[r[8]] || 'nf', qtd: 0, valor: 0, dias: 0, _t: new Map() }; m.set(chave, e); }
    e.qtd++; e.valor += r[4];
    if (r[5] > e.dias) e.dias = r[5];
    const t = GD.temas[r[2]]; e._t.set(t, (e._t.get(t) || 0) + 1);
  }
  return [...m.values()].map(e => {
    e.tema = [...e._t.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))[0][0];
    delete e._t; return e;
  });
})();
const probTotal = problemas.length;
const probCorrigidos = problemas.filter(p => p.fase === 'fim');
const probAbertos = problemas.filter(p => p.fase !== 'fim');
const probEmCorrecao = problemas.filter(p => ['n1', 'n2', 'n3'].includes(p.fase));
const probN3 = problemas.filter(p => p.fase === 'n3');
const valorRetido = soma(probAbertos, p => p.valor);
const valorDestravado = soma(probCorrigidos, p => p.valor);

const prontos = fila.filter(i => faseDaChave.get(i.key) === 'fim');
const filaSup = DA.fila;
const filaSupTotal = soma(filaSup, f => f.valor);
const gdTotalV = soma(GD.rows, r => r[4]);

/* ---------- documento ---------- */
const partes = [];
const add = h => partes.push(h);

add(`<p>${lozenge('DADOS EXTRAÍDOS DO JIRA EM ' + dataBR(DT.geradoEm), 'Blue')} ${lozenge('3 ETAPAS · TIME DE TI', 'Grey')}</p>`);
add(`<p>Filtro <strong>TI SDPREJ - GERAL</strong> nas três etapas em que o chamado está com o time de TI: <strong>análise área responsável</strong>, <strong>Aprovação diretoria</strong> e <strong>Conferência supervisão/gerência</strong>. Os números desta página são os mesmos da <em>Visão geral</em> do painel interativo.</p>`);
add(`<ac:structured-macro ac:name="toc"><ac:parameter ac:name="maxLevel">2</ac:parameter><ac:parameter ac:name="minLevel">2</ac:parameter></ac:structured-macro>`);

/* 1. resumo */
add(`<h2>Resumo executivo</h2>`);
add(colunas([
  card('Chamados no recorte', nfInt(T), 'somando as 3 etapas com a TI', 'azul'),
  card('Prejuízo reclamado', nfBRL(V), 'soma de Prejuízo após Reversão', 'amarelo'),
  card('Acima de 180 dias', nfInt(K.acima180d), `${pc(K.acima180d, T)} do recorte · risco de prescrição`, 'vermelho'),
]));
add(colunas([
  card('Idade média', nfInt(K.idadeMedia) + ' dias', 'desde a abertura do SDPREJ', 'cinza'),
  card('Valor mediano', nfBRL(K.valorMediana), 'metade dos casos vale menos que isso', 'cinza'),
  card('Maior caso', nfBRL(K.valorMax), 'maior prejuízo individual do recorte', 'cinza'),
]));
add(aviso('Painel interativo completo',
  `<p>Gráficos, filtros por tema, produto, área, período e etapa, fila de atuação e histórico encerrado estão no painel: ` +
  `<a href="${PAINEL_URL}"><strong>abrir painel interativo</strong></a>. ` +
  `O arquivo HTML da última atualização também fica anexado a esta página.</p>`, 'tip'));

/* 2. por etapa */
add(`<h2>Por etapa</h2>`);
add(`<p>Onde está o prejuízo hoje: cada chamado está em exatamente uma das três etapas.</p>`);
const maxEv = Math.max(...porEtapa.map(e => e.v));
add(tabela(['Etapa', 'Chamados', '% dos chamados', 'Prejuízo R$', 'Acima de 180 dias', 'Idade média', 'Peso do valor'],
  porEtapa.map(e => [lozenge(e.nome, ETAPA_COR[e.nome]), nfInt(e.n), pc(e.n, T), `<strong>${nfBRL(e.v)}</strong>`,
    nfInt(e.a180) + ' (' + pc(e.a180, e.n) + ')', nfInt(e.idade) + ' dias', bar(e.v / maxEv)])
  .concat([[`<strong>Total</strong>`, `<strong>${nfInt(T)}</strong>`, '100%', `<strong>${nfBRL(V)}</strong>`,
    `<strong>${nfInt(K.acima180d)}</strong>`, `<strong>${nfInt(K.idadeMedia)} dias</strong>`, '']])));

/* 3. natureza */
add(`<h2>Natureza do prejuízo</h2>`);
add(`<p>Separa falha técnica de falha de processo. É uma <strong>proposta de classificação por tema</strong> (regra revisável, não é um campo do Jira). Cancelamento sem integração fica em "Ambíguo" de propósito: exige análise caso a caso.</p>`);
const TIPO_COR = { 'Falha técnica (sistema/integração)': 'Red', 'Processo / decisão humana': 'Blue', 'Ambíguo (requer análise caso a caso)': 'Yellow', 'Não classificado': 'Grey' };
add(tabela(['Natureza', 'Chamados', '% dos chamados', 'Prejuízo R$', '% do valor', 'Peso do valor'],
  DT.tipos.map(t => [lozenge(t.name, TIPO_COR[t.name] || 'Grey'), nfInt(t.count), pc(t.count, T), `<strong>${nfBRL(t.valor)}</strong>`, pc(t.valor, V), bar(t.valor / V)])));

/* 4. tema / produto / aging */
add(`<h2>Temas, produtos e envelhecimento</h2>`);
add(`<h3>Por tema</h3>`);
add(tabela(['Tema', 'Chamados', 'Prejuízo R$', '% do valor', 'Peso do valor'],
  DT.temas.map(t => [esc(t.name), nfInt(t.count), `<strong>${nfBRL(t.valor)}</strong>`, pc(t.valor, V), bar(t.valor / V)])));
add(`<h3>Por produto</h3>`);
add(`<p>O produto é inferido do resumo do chamado (texto livre), então "Não identificado" é esperado.</p>`);
add(tabela(['Produto', 'Chamados', 'Prejuízo R$', '% do valor', 'Peso do valor'],
  DT.produto.map(t => [esc(t.name), nfInt(t.count), `<strong>${nfBRL(t.valor)}</strong>`, pc(t.valor, V), bar(t.valor / V)])));
add(`<h3>Envelhecimento do backlog</h3>`);
add(tabela(['Faixa de idade', 'Chamados', '% dos chamados', 'Prejuízo R$', 'Peso dos chamados'],
  DT.aging.map(t => [esc(t.name), nfInt(t.count), pc(t.count, T), `<strong>${nfBRL(t.valor)}</strong>`, bar(t.count / T)])));

/* 5. maiores casos */
add(`<h2>Dez maiores prejuízos</h2>`);
add(tabela(['Chave', 'Resumo', 'Tema', 'Etapa', 'Dias', 'Valor R$'],
  [...I].sort((a, b) => b.valor - a.valor).slice(0, 10).map(i => [
    link(i.key), esc(String(i.summary || '').slice(0, 60)), esc(i.temaDerivado), lozenge(i.status, ETAPA_COR[i.status] || 'Grey'),
    i.diasAberto > 180 ? `<strong>${nfInt(i.diasAberto)}d</strong>` : nfInt(i.diasAberto) + 'd', `<strong>${nfBRL(i.valor)}</strong>`])));

/* 6. fila de atuação */
add(`<h2>Fila de atuação — análise área responsável</h2>`);
add(`<p>Chamados aguardando análise do time de TI (<a href="${JIRA}/issues/?jql=${encodeURIComponent(JQL_FILA)}">abrir no Jira</a>). Os <strong>prontos para tratar</strong> têm o GDIS vinculado já encerrado: a causa técnica foi resolvida e o chamado só espera análise.</p>`);
add(colunas([
  card('Chamados na fila', nfInt(fila.length), nfBRL(soma(fila, i => i.valor)) + ' em prejuízo', 'azul'),
  card('Prontos para tratar', nfInt(prontos.length), `GDIS encerrado · ${nfBRL(soma(prontos, i => i.valor))}`, 'verde'),
  card('Acima de 180 dias', nfInt(fila.filter(i => i.diasAberto > 180).length), 'risco de prescrição', 'vermelho'),
  card('Sem movimento > 30 dias', nfInt(fila.filter(i => i.parado > 30).length), 'parados no Jira', 'amarelo'),
]));
add(`<h3>Prontos mais antigos (dez primeiros)</h3>`);
add(tabela(['Chave', 'Resumo', 'Dias', 'Sem mov.', 'Valor R$'],
  [...prontos].sort((a, b) => b.diasAberto - a.diasAberto || b.valor - a.valor).slice(0, 10).map(i => [
    link(i.key), esc(String(i.summary || '').slice(0, 60)), nfInt(i.diasAberto) + 'd', nfInt(i.parado) + 'd', `<strong>${nfBRL(i.valor)}</strong>`])));

/* 7. analistas */
add(`<h2>Analistas — conferência supervisão/gerência</h2>`);
add(`<p><strong>${nfInt(filaSup.length)}</strong> chamados aguardando supervisão · valor retido <strong>${nfBRL(filaSupTotal)}</strong>.</p>`);
const FAIXAS = [['0-30 dias', 0, 30], ['31-90 dias', 31, 90], ['91-180 dias', 91, 180], ['181+ dias', 181, Infinity]];
add(tabela(['Tempo na fila', 'Chamados', 'Valor R$', 'Peso dos chamados'],
  FAIXAS.map(([nome, lo, hi]) => { const g = filaSup.filter(f => f.diasNaFila >= lo && f.diasNaFila <= hi);
    return [nome, nfInt(g.length), `<strong>${nfBRL(soma(g, f => f.valor))}</strong>`, bar(g.length / (filaSup.length || 1))]; })));
add(expande('Dez maiores tempos de espera', tabela(['Chave', 'Enviado por', 'Dias', 'Valor R$'],
  [...filaSup].sort((a, b) => b.diasNaFila - a.diasNaFila).slice(0, 10).map(f => [
    link(f.key), esc(f.enviadoPor), nfInt(f.diasNaFila) + 'd', `<strong>${nfBRL(f.valor)}</strong>`]))));

/* 8. GDIS */
add(`<h2>Vínculo com GDIS</h2>`);
const porSit = new Map();
GD.rows.forEach(r => { const l = r[9] >= 0 ? GD.gsts[r[9]] : 'Sem classificação'; const e = porSit.get(l) || { n: 0, v: 0 }; e.n++; e.v += r[4]; porSit.set(l, e); });
add(tabela(['Situação do GDIS', 'Chamados', 'Prejuízo R$', '% do valor'],
  [...porSit.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 10).map(([l, e]) => [esc(l), nfInt(e.n), `<strong>${nfBRL(e.v)}</strong>`, pc(e.v, gdTotalV)])));
const multi = problemas.filter(p => p.qtd > 1).sort((a, b) => b.qtd - a.qtd).slice(0, 10);
add(expande('GDIS com mais chamados vinculados', tabela(['GDIS', 'Chamados vinculados', 'Prejuízo R$'],
  multi.map(p => [link(p.gdis), nfInt(p.qtd), `<strong>${nfBRL(p.valor)}</strong>`]))));

/* 9. ciclo de correção */
add(`<h2>Ciclo de correção do problema</h2>`);
add(`<p>De <strong>aberto</strong> a <strong>corrigido</strong>: em que fase está cada problema de TI que originou prejuízo. A unidade aqui é o <strong>problema</strong> (um GDIS), não o chamado, por isso estes totais não fecham com os das seções anteriores.</p>`);
add(colunas([
  card('Problemas corrigidos', nfInt(probCorrigidos.length), pc(probCorrigidos.length, probTotal) + ' de ' + nfInt(probTotal) + ' rastreados', 'verde'),
  card('Em correção', nfInt(probEmCorrecao.length), 'análise técnica em curso', 'amarelo'),
  card('No Nível 3', nfInt(probN3.length), 'gargalo', 'vermelho'),
]));
add(colunas([
  card('Prejuízo retido', nfBRL(valorRetido), nfInt(soma(probAbertos, p => p.qtd)) + ' SDPREJ travados', 'vermelho'),
  card('Prejuízo destravado', nfBRL(valorDestravado), nfInt(soma(probCorrigidos, p => p.qtd)) + ' SDPREJ liberados', 'verde'),
]));
add(tabela(['Fase', 'Problemas', '% do total', 'SDPREJ vinculados', 'Prejuízo R$'],
  FASE_ORDEM.map(c => { const g = problemas.filter(p => p.fase === c); if (!g.length) return null;
    return [lozenge(FASE_LBL[c], FASE_COR[c]), nfInt(g.length), pc(g.length, probTotal), nfInt(soma(g, p => p.qtd)), `<strong>${nfBRL(soma(g, p => p.valor))}</strong>`]; })
  .filter(Boolean)
  .concat([[`<strong>Total</strong>`, `<strong>${nfInt(probTotal)}</strong>`, '100%', `<strong>${nfInt(soma(problemas, p => p.qtd))}</strong>`, `<strong>${nfBRL(soma(problemas, p => p.valor))}</strong>`]])));
add(`<h3>Onde corrigir devolve mais valor</h3>`);
add(`<p>Problemas ainda não corrigidos, do que segura mais prejuízo para o que segura menos.</p>`);
add(tabela(['Problema', 'Fase', 'Tema predominante', 'SDPREJ', 'Dias', 'Prejuízo retido R$'],
  [...probAbertos].sort((a, b) => b.valor - a.valor).slice(0, 10).map(p => [
    link(p.gdis), lozenge(FASE_LBL[p.fase], FASE_COR[p.fase]), esc(p.tema), nfInt(p.qtd), nfInt(p.dias) + 'd', `<strong>${nfBRL(p.valor)}</strong>`])));
add(aviso('Onde ver o detalhe completo',
  `<p>Esta página é o resumo. O detalhe navegável está na página <strong>"SDPREJ — Ciclo de Correção do Problema"</strong> (filha desta) e no painel interativo, com filtros, ordenação e download em CSV.</p>`));

/* rodapé */
add(`<hr/>`);
add(`<p style="text-align: center;"><em>SDPREJ · Trend Operadora · atualização automática de segunda a sexta às 8h · versão 3.0 (3 etapas)</em></p>`);

const html = partes.join('\n');
fs.writeFileSync(path.join(__dirname, 'confluence-content.html'), html, 'utf8');
console.log(`confluence-content.html gerado: ${(html.length / 1024).toFixed(1)} KB`);
console.log(`  recorte: ${nfInt(T)} chamados · ${nfBRL(V)} · >180d ${nfInt(K.acima180d)} · fila ${nfInt(fila.length)} (${nfInt(prontos.length)} prontos)`);
