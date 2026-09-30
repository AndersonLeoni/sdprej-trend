#!/usr/bin/env node
/**
 * generate-relatorio-problemas.js — Relatório "de aberto a corrigido" para Confluence
 *
 * Reagrega data/gdis.json por PROBLEMA (um GDIS), não por chamado de prejuízo.
 * Nenhuma consulta ao Jira: o status real de cada GDIS já vem no payload.
 *
 * Uso: node generate-relatorio-problemas.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const GD = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'gdis.json'), 'utf8'));

const nfInt = v => new Intl.NumberFormat('pt-BR').format(Math.round(v));
const nfBRL = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[c]));
const pc = (a, b) => b ? (a / b * 100).toFixed(1).replace('.', ',') : '0';

/* mesmas fases da visão do painel, na mesma ordem do fluxo */
const FASES = [
  { c: 'pen', lbl: 'Aberto / pendente', bg: '#fff3e0', fg: '#e65100' },
  { c: 'n1', lbl: 'Em correção · Nível 1', bg: '#e3f2fd', fg: '#1565c0' },
  { c: 'n2', lbl: 'Em correção · Nível 2', bg: '#e3f2fd', fg: '#1565c0' },
  { c: 'n3', lbl: 'Em correção · Nível 3', bg: '#ffebee', fg: '#c62828' },
  { c: 'usr', lbl: 'Aguardando validação do usuário', bg: '#fff3e0', fg: '#e65100' },
  { c: 'fim', lbl: 'Corrigido', bg: '#e8f5e9', fg: '#2e7d32' },
  { c: 'nf', lbl: 'GDIS não localizado', bg: '#f5f5f5', fg: '#666' },
];
const FL = Object.fromEntries(FASES.map(f => [f.c, f]));
const BK = { pen: 'pen', n1: 'n1', n2: 'n2', n3: 'n3', usr: 'usr', res: 'fim', can: 'fim', des: 'fim', nf: 'nf' };
const EM_CORRECAO = ['n1', 'n2', 'n3'];

/* --- agrupa por GDIS distinto ------------------------------------------- */
const porProblema = new Map();
for (const r of GD.rows) {
  const chave = String(r[5] || '').trim();
  if (!/^GDIS-\d+$/.test(chave)) continue;          // só vínculo rastreável

  let e = porProblema.get(chave);
  if (!e) {
    e = {
      gdis: chave,
      gstat: r[7] >= 0 ? GD.gsts[r[7]] : '',
      fase: BK[r[6]] || 'nf',
      keys: [], qtd: 0, valor: 0, dias: 0, temas: new Map(),
    };
    porProblema.set(chave, e);
  }
  e.keys.push('SDPREJ-' + r[0]);
  e.qtd++;
  e.valor += r[3];
  if (r[4] > e.dias) e.dias = r[4];
  const tema = GD.temas[r[2]];
  e.temas.set(tema, (e.temas.get(tema) || 0) + 1);
}

const problemas = [...porProblema.values()].map(e => {
  e.tema = [...e.temas.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))[0][0];
  delete e.temas;
  return e;
});

const aberto = p => !(FL[p.fase] && p.fase === 'fim');
const soma = (lista, f) => lista.reduce((a, p) => a + f(p), 0);

const total = problemas.length;
const corrigidos = problemas.filter(p => p.fase === 'fim');
const abertos = problemas.filter(aberto);
const emCorrecao = problemas.filter(p => EM_CORRECAO.includes(p.fase));
const nivel3 = problemas.filter(p => p.fase === 'n3');

const valorRetido = soma(abertos, p => p.valor);
const valorDestravado = soma(corrigidos, p => p.valor);
const sdprejRetidos = soma(abertos, p => p.qtd);
const sdprejDestravados = soma(corrigidos, p => p.qtd);

/* --- conteúdo ----------------------------------------------------------- */
const linhaFase = f => {
  const g = problemas.filter(p => p.fase === f.c);
  if (!g.length) return '';
  return `<tr>
<td style="background:${f.bg}"><strong style="color:${f.fg}">${esc(f.lbl)}</strong></td>
<td style="text-align:right">${nfInt(g.length)}</td>
<td style="text-align:right">${pc(g.length, total)}%</td>
<td style="text-align:right">${nfInt(soma(g, p => p.qtd))}</td>
<td style="text-align:right"><strong>${nfBRL(soma(g, p => p.valor))}</strong></td>
</tr>`;
};

const filaPrioridade = [...abertos].sort((a, b) => b.valor - a.valor).slice(0, 15);

let html = `<p><strong>🔁 CICLO DE CORREÇÃO DO PROBLEMA — DE ABERTO A CORRIGIDO</strong></p>
<p style="font-size:12px;color:#666">Trend Operadora — Em que fase está cada chamado de TI que originou prejuízo, e quanto prejuízo cada fase ainda segura | 📅 ${new Date().toLocaleString('pt-BR')} | Extração: ${esc(GD.geradoEm)}</p>

<ac:structured-macro ac:name="note">
<ac:parameter ac:name="title">Como ler este relatório</ac:parameter>
<ac:rich-text-body>
<p>A unidade aqui é o <strong>problema</strong> (um GDIS), não o chamado de prejuízo. Um mesmo problema pode responder por vários SDPREJ — por isso os totais deste relatório não fecham com os do dashboard de prejuízos, e isso é proposital.</p>
<p><strong>Prejuízo retido</strong> = soma dos SDPREJ presos a problema ainda não corrigido. Corrigir a causa não fecha o chamado de prejuízo sozinho, mas remove o impedimento técnico que o mantém parado.</p>
</ac:rich-text-body>
</ac:structured-macro>

<h2 style="color:#003366;border-left:4px solid #FF6B35;padding-left:12px">📊 RESUMO EXECUTIVO</h2>

<table style="width:100%;border-spacing:8px;border-collapse:separate">
<tbody>
<tr>
<td style="background:#e3f2fd;border-left:4px solid #1976d2;padding:12px;border-radius:4px;text-align:center">
<div style="font-size:28px;font-weight:bold;color:#1565c0">${nfInt(total)}</div>
<div style="font-size:12px;color:#333;margin-top:4px"><strong>Problemas rastreados</strong></div>
<div style="font-size:10px;color:#666">GDIS distintos com prejuízo</div>
</td>

<td style="background:#e8f5e9;border-left:4px solid #388e3c;padding:12px;border-radius:4px;text-align:center">
<div style="font-size:28px;font-weight:bold;color:#2e7d32">${nfInt(corrigidos.length)}</div>
<div style="font-size:12px;color:#333;margin-top:4px"><strong>Já corrigidos</strong></div>
<div style="font-size:10px;color:#2e7d32;font-weight:bold">${pc(corrigidos.length, total)}% do total</div>
</td>

<td style="background:#fff3e0;border-left:4px solid #f57c00;padding:12px;border-radius:4px;text-align:center">
<div style="font-size:28px;font-weight:bold;color:#e65100">${nfInt(emCorrecao.length)}</div>
<div style="font-size:12px;color:#333;margin-top:4px"><strong>Em correção</strong></div>
<div style="font-size:10px;color:#666">análise técnica em curso</div>
</td>

<td style="background:#ffebee;border-left:4px solid #d32f2f;padding:12px;border-radius:4px;text-align:center">
<div style="font-size:28px;font-weight:bold;color:#c62828">${nfInt(nivel3.length)}</div>
<div style="font-size:12px;color:#333;margin-top:4px"><strong>No Nível 3</strong></div>
<div style="font-size:10px;color:#c62828;font-weight:bold">⚠️ topo do escalonamento</div>
</td>

<td style="background:#ffebee;border-left:4px solid #d32f2f;padding:12px;border-radius:4px;text-align:center">
<div style="font-size:20px;font-weight:bold;color:#c62828">${nfBRL(valorRetido)}</div>
<div style="font-size:12px;color:#333;margin-top:4px"><strong>Prejuízo retido</strong></div>
<div style="font-size:10px;color:#666">${nfInt(sdprejRetidos)} SDPREJ presos</div>
</td>

<td style="background:#e8f5e9;border-left:4px solid #388e3c;padding:12px;border-radius:4px;text-align:center">
<div style="font-size:20px;font-weight:bold;color:#2e7d32">${nfBRL(valorDestravado)}</div>
<div style="font-size:12px;color:#333;margin-top:4px"><strong>Prejuízo destravado</strong></div>
<div style="font-size:10px;color:#666">${nfInt(sdprejDestravados)} SDPREJ liberados</div>
</td>
</tr>
</tbody>
</table>

<hr/>

<h1>🔁 DE ABERTO A CORRIGIDO — FASES DO PROBLEMA</h1>
<p>As fases na ordem real do fluxo. Cada linha conta <strong>problemas distintos</strong>, não chamados de prejuízo.</p>

<table>
<tbody>
<tr><th>Fase</th><th style="text-align:right">Problemas</th><th style="text-align:right">% do total</th><th style="text-align:right">SDPREJ vinculados</th><th style="text-align:right">Prejuízo R$</th></tr>
${FASES.map(linhaFase).join('')}
<tr style="background:#f5f5f5">
<td><strong>TOTAL</strong></td>
<td style="text-align:right"><strong>${nfInt(total)}</strong></td>
<td style="text-align:right"><strong>100%</strong></td>
<td style="text-align:right"><strong>${nfInt(soma(problemas, p => p.qtd))}</strong></td>
<td style="text-align:right"><strong>${nfBRL(soma(problemas, p => p.valor))}</strong></td>
</tr>
</tbody>
</table>

<hr/>

<h1>🎯 FILA DE CORREÇÃO POR PRIORIDADE DE VALOR</h1>
<p>Problemas <strong>ainda não corrigidos</strong>, do que segura mais prejuízo para o que segura menos. O topo desta lista é onde a correção devolve mais valor.</p>

${filaPrioridade.length ? `
<table>
<tbody>
<tr><th>Problema</th><th>Status no Jira</th><th>Fase</th><th>Tema predominante</th><th style="text-align:right">SDPREJ</th><th style="text-align:right">Dias</th><th style="text-align:right">Prejuízo retido R$</th></tr>
${filaPrioridade.map(p => `<tr>
<td><a href="https://cvccorp.atlassian.net/browse/${esc(p.gdis)}"><strong>${esc(p.gdis)}</strong></a></td>
<td>${esc(p.gstat || '—')}</td>
<td style="color:${FL[p.fase].fg};font-weight:bold">${esc(FL[p.fase].lbl)}</td>
<td>${esc(p.tema)}</td>
<td style="text-align:right">${nfInt(p.qtd)}</td>
<td style="text-align:right"${p.dias > 365 ? ' style="color:#c62828;font-weight:bold"' : ''}>${nfInt(p.dias)}d</td>
<td style="text-align:right;color:#c62828;font-weight:bold">${nfBRL(p.valor)}</td>
</tr>`).join('')}
</tbody>
</table>
<p style="font-size:12px;color:#666">Estes ${nfInt(filaPrioridade.length)} problemas respondem por <strong>${pc(soma(filaPrioridade, p => p.valor), valorRetido)}%</strong> de todo o prejuízo retido.</p>
` : '<p style="color:#999;font-style:italic">Nenhum problema em aberto.</p>'}

<hr/>

<h1>⚠️ NÍVEL 3 — TOPO DO ESCALONAMENTO</h1>
<p>Problemas no nível técnico mais alto. O que não se resolve aqui não tem para onde subir.</p>

${nivel3.length ? `
<table>
<tbody>
<tr><th>Problema</th><th>Tema predominante</th><th style="text-align:right">SDPREJ</th><th style="text-align:right">Dias</th><th style="text-align:right">Prejuízo R$</th></tr>
${[...nivel3].sort((a, b) => b.valor - a.valor).map(p => `<tr>
<td><a href="https://cvccorp.atlassian.net/browse/${esc(p.gdis)}"><strong>${esc(p.gdis)}</strong></a></td>
<td>${esc(p.tema)}</td>
<td style="text-align:right">${nfInt(p.qtd)}</td>
<td style="text-align:right">${nfInt(p.dias)}d</td>
<td style="text-align:right;color:#c62828;font-weight:bold">${nfBRL(p.valor)}</td>
</tr>`).join('')}
</tbody>
</table>
<p style="font-size:12px;color:#666">O Nível 3 concentra <strong>${pc(nivel3.length, emCorrecao.length)}%</strong> dos problemas em análise e <strong>${nfBRL(soma(nivel3, p => p.valor))}</strong> em prejuízo.</p>
` : '<p style="color:#999;font-style:italic">Nenhum problema no Nível 3 — a análise em curso está toda em N1/N2.</p>'}

<hr/>

<h1>✅ PROBLEMAS JÁ CORRIGIDOS — MAIOR IMPACTO DESTRAVADO</h1>
<p>Correções concluídas, ordenadas pelo prejuízo que deixaram de travar.</p>

${corrigidos.length ? `
<table>
<tbody>
<tr><th>Problema</th><th>Status no Jira</th><th>Tema predominante</th><th style="text-align:right">SDPREJ destravados</th><th style="text-align:right">Prejuízo R$</th></tr>
${[...corrigidos].sort((a, b) => b.valor - a.valor).slice(0, 20).map(p => `<tr>
<td><a href="https://cvccorp.atlassian.net/browse/${esc(p.gdis)}"><strong>${esc(p.gdis)}</strong></a></td>
<td>${esc(p.gstat || '—')}</td>
<td>${esc(p.tema)}</td>
<td style="text-align:right">${nfInt(p.qtd)}</td>
<td style="text-align:right;color:#2e7d32;font-weight:bold">${nfBRL(p.valor)}</td>
</tr>`).join('')}
</tbody>
</table>
<p style="font-size:12px;color:#666">Exibindo os 20 maiores de ${nfInt(corrigidos.length)} problemas corrigidos, que juntos destravaram ${nfBRL(valorDestravado)}.</p>
` : '<p style="color:#999;font-style:italic">Nenhum problema corrigido no recorte.</p>'}

<hr/>

<p style="font-size:11px;color:#999;text-align:center;margin-top:32px">
🔁 Ciclo de Correção — Trend Operadora<br/>
Fonte: campo <code>nº ocorrência</code> do SDPREJ + status real de cada GDIS no Jira<br/>
Problema referenciado fora do padrão GDIS-nnnn não entra nesta contagem<br/>
🔄 Atualização: diária | 📅 Gerado: ${new Date().toLocaleString('pt-BR')}
</p>
`;

fs.writeFileSync(path.join(__dirname, 'relatorio-problemas.html'), html, 'utf8');

console.log('✅ relatorio-problemas.html gerado!');
console.log(`   ${(html.length / 1024).toFixed(1)} KB\n`);
console.log('📊 Ciclo de correção:');
FASES.forEach(f => {
  const n = problemas.filter(p => p.fase === f.c).length;
  if (n) console.log(`   ${f.lbl.padEnd(34)} ${String(n).padStart(5)} problemas`);
});
console.log(`   ${'—'.repeat(40)}`);
console.log(`   Total de problemas rastreados:      ${String(total).padStart(5)}`);
console.log(`   SDPREJ vinculados:                  ${String(soma(problemas, p => p.qtd)).padStart(5)}`);
console.log(`   Prejuízo retido (não corrigido):    ${nfBRL(valorRetido)}`);
console.log(`   Prejuízo destravado (corrigido):    ${nfBRL(valorDestravado)}\n`);
