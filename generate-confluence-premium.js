#!/usr/bin/env node
/**
 * generate-confluence-premium.js — Apresentação Premium SDPREJ
 *
 * Design profissional usando macros nativas do Confluence
 * Sem CSS customizado (não funciona bem no Confluence)
 *
 * Uso: node generate-confluence-premium.js
 */

const fs = require('fs');
const path = require('path');

// URL do GitHub Pages — acessível publicamente
const PAINEL_URL = 'https://AndersonLeoni.github.io/sdprej-trend/';

const DT = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'temas.json'), 'utf8'));
const DA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'analistas.json'), 'utf8'));
const GD = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'gdis.json'), 'utf8'));

const nfBRL = v => new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL', maximumFractionDigits: 0}).format(v);
const nfInt = v => new Intl.NumberFormat('pt-BR').format(Math.round(v));
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[c]));

const filaTotal = DA.fila.reduce((s, f) => s + f.valor, 0);

let html = `<p><strong>📊 SDPREJ — Dashboard de Prejuízos</strong></p>
<p style="font-size: 12px; color: #666;">Trend Operadora — Gestão Centralizada de Reclamações e Análise de Risco | 📅 ${new Date().toLocaleString('pt-BR')} | 🔄 Atualização Automática: Diária</p>

<h2 style="color: #003366; border-left: 4px solid #FF6B35; padding-left: 12px; margin-top: 16px;">📊 RESUMO EXECUTIVO — KPIs PRINCIPAIS</h2>

<table style="width: 100%; border-spacing: 8px; border-collapse: separate;">
<tbody>
<tr>
<td style="background: #e3f2fd; border-left: 4px solid #1976d2; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 28px; font-weight: bold; color: #1565c0;">${nfInt(DT.kpis.total)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>Chamados em Análise</strong></div>
<div style="font-size: 10px; color: #666;">Status: Ativo</div>
</td>

<td style="background: #e8f5e9; border-left: 4px solid #388e3c; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 24px; font-weight: bold; color: #2e7d32;">${nfBRL(DT.kpis.valorTotal)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>Valor Reclamado</strong></div>
<div style="font-size: 10px; color: #666;">Total de Prejuízos</div>
</td>

<td style="background: #ffebee; border-left: 4px solid #d32f2f; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 28px; font-weight: bold; color: #c62828;">${nfInt(DT.kpis.acima180d)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>Acima de 180 dias</strong></div>
<div style="font-size: 10px; color: #c62828; font-weight: bold;">⚠️ RISCO DE PRESCRIÇÃO</div>
</td>

<td style="background: #fff3e0; border-left: 4px solid #f57c00; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 28px; font-weight: bold; color: #e65100;">${nfInt(DA.fila.length)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>Parados em TI</strong></div>
<div style="font-size: 10px; color: #e65100; font-weight: bold;">🔴 CRÍTICO</div>
</td>

<td style="background: #ffebee; border-left: 4px solid #d32f2f; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 24px; font-weight: bold; color: #c62828;">${nfBRL(filaTotal)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>Valor Retido</strong></div>
<div style="font-size: 10px; color: #c62828; font-weight: bold;">💔 BLOQUEADO</div>
</td>

<td style="background: #f3e5f5; border-left: 4px solid #7b1fa2; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 28px; font-weight: bold; color: #6a1b9a;">${nfInt(DA.ciclos.length)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>Ciclos Concluídos</strong></div>
<div style="font-size: 10px; color: #666;">Análises Entregues</div>
</td>
</tr>
</tbody>
</table>

<ac:structured-macro ac:name="warning">
<ac:parameter ac:name="title">🖥️ PAINEL INTERATIVO DISPONÍVEL</ac:parameter>
<ac:rich-text-body>
<p><strong>Acesse o painel completo com gráficos dinâmicos, filtros interativos e análises em tempo real.</strong></p>
<p style="margin: 12px 0 0 0;">
<a href="${PAINEL_URL}" target="_blank" style="display: inline-block; background: #003366; color: white; padding: 10px 20px; border-radius: 4px; font-weight: bold; font-size: 14px; text-decoration: none;">→ ABRIR PAINEL INTERATIVO</a>
</p>
<p style="font-size: 12px; color: #666; margin: 8px 0 0 0;">Navegação: Temas • Analistas • GDIS | Filtros • Gráficos • Dados ao vivo</p>
</ac:rich-text-body>
</ac:structured-macro>

<hr/>

<h1>📋 VISÃO 1: TEMAS</h1>
<p>Distribuição dos chamados pelo padrão derivado e valor reclamado.</p>

<h3>Classificação por Tema</h3>
<table>
<tbody>
<tr><th>Tema</th><th>Chamados</th><th>Valor Reclamado</th><th>% Total</th></tr>
${DT.temas.map(t => `
<tr>
<td>${esc(t.name)}</td>
<td>${nfInt(t.count)}</td>
<td style="text-align: right;"><strong>${nfBRL(t.valor)}</strong></td>
<td style="text-align: right;">${((t.valor / DT.kpis.valorTotal) * 100).toFixed(1)}%</td>
</tr>`).join('')}
</tbody>
</table>

<h3>Top 10 Chamados por Valor</h3>
<table>
<tbody>
<tr><th>Chave</th><th>Tema</th><th>Dias</th><th>Valor R$</th></tr>
${DT.issues.sort((a, b) => b.valor - a.valor).slice(0, 10).map(i => {
  const isAlert = i.diasAberto > 180;
  return `<tr>
<td><strong>${esc(i.key)}</strong></td>
<td>${esc(i.temaDerivado.substring(0, 30))}</td>
<td ${isAlert ? 'style="background: #ffe0e0; color: #c00; font-weight: bold;"' : ''}>${nfInt(i.diasAberto)}d</td>
<td style="text-align: right;"><strong>${nfBRL(i.valor)}</strong></td>
</tr>`;
}).join('')}
</tbody>
</table>

<hr/>

<h1>👤 VISÃO 2: ANALISTAS</h1>
<p><strong style="color: #c00;">⚠️ ${nfInt(DA.fila.length)} chamados aguardando supervisão</strong> • Valor retido: <strong>${nfBRL(filaTotal)}</strong></p>

<h3>Maior Tempo de Espera (Top 10)</h3>
<table>
<tbody>
<tr><th>Chave</th><th>Analista</th><th>Dias</th><th>Valor R$</th></tr>
${DA.fila.sort((a, b) => b.diasNaFila - a.diasNaFila).slice(0, 10).map(f => {
  const isAlert = f.diasNaFila > 180;
  return `<tr>
<td><strong>${esc(f.key)}</strong></td>
<td>${esc(f.enviadoPor.substring(0, 20))}</td>
<td ${isAlert ? 'style="background: #ffe0e0; color: #c00; font-weight: bold;"' : ''}>${nfInt(f.diasNaFila)}d</td>
<td style="text-align: right;"><strong>${nfBRL(f.valor)}</strong></td>
</tr>`;
}).join('')}
</tbody>
</table>

<h3>Fila por Faixa de Dias</h3>
<table>
<tbody>
<tr><th>Faixa</th><th>Chamados</th><th>Valor Total</th></tr>
${(() => {
  const faixas = {
    '0-30 dias': { n: 0, v: 0 },
    '31-90 dias': { n: 0, v: 0 },
    '91-180 dias': { n: 0, v: 0 },
    '181+ dias': { n: 0, v: 0 }
  };
  DA.fila.forEach(f => {
    let faixa;
    if (f.diasNaFila <= 30) faixa = '0-30 dias';
    else if (f.diasNaFila <= 90) faixa = '31-90 dias';
    else if (f.diasNaFila <= 180) faixa = '91-180 dias';
    else faixa = '181+ dias';
    faixas[faixa].n++;
    faixas[faixa].v += f.valor;
  });
  return Object.entries(faixas)
    .map(([faixa, e]) => {
      const isAlert = faixa === '181+ dias';
      return `<tr ${isAlert ? 'style="background: #ffe0e0;"' : ''}>
<td><strong>${faixa}</strong></td>
<td>${nfInt(e.n)}</td>
<td style="text-align: right; ${isAlert ? 'color: #c00; font-weight: bold;' : ''}"><strong>${nfBRL(e.v)}</strong></td>
</tr>`;
    }).join('');
})()}
</tbody>
</table>

<hr/>

<h1>🔗 VISÃO 3: GDIS</h1>
<p>Rastreamento de chamados vinculados a GDIS.</p>

<h3>Situação dos GDIS</h3>
<table>
<tbody>
<tr><th>Situação</th><th>Chamados</th><th>Valor R$</th><th>% Total</th></tr>
${(() => {
  const m = new Map();
  GD.rows.forEach(r => {
    const label = r[7] >= 0 ? GD.gsts[r[7]] : 'Sem classificação';
    const e = m.get(label) || {n: 0, v: 0};
    e.n++; e.v += r[3]; m.set(label, e);
  });
  return [...m.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 10)
    .map(([label, e]) => `<tr>
<td>${esc(label)}</td>
<td>${nfInt(e.n)}</td>
<td style="text-align: right;"><strong>${nfBRL(e.v)}</strong></td>
<td style="text-align: right;">${((e.v / DT.kpis.valorTotal) * 100).toFixed(1)}%</td>
</tr>`)
    .join('');
})()}
</tbody>
</table>

<h3>GDIS com Múltiplos Chamados</h3>
<table>
<tbody>
<tr><th>GDIS</th><th>Chamados Vinculados</th><th>Valor Total</th></tr>
${(() => {
  const m = new Map();
  GD.rows.filter(r => /^GDIS-\d+$/.test(r[5] || '')).forEach(r => {
    const g = r[5];
    const e = m.get(g) || {n: 0, v: 0};
    e.n++; e.v += r[3]; m.set(g, e);
  });
  return [...m.entries()]
    .filter(([, e]) => e.n > 1)
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 10)
    .map(([gdis, e]) => `<tr>
<td><strong>${esc(gdis)}</strong></td>
<td>${nfInt(e.n)} chamados</td>
<td style="text-align: right;"><strong>${nfBRL(e.v)}</strong></td>
</tr>`)
    .join('');
})()}
</tbody>
</table>

<hr/>

<p style="font-size: 11px; color: #999; text-align: center; margin-top: 32px;">
✅ Dashboard SDPREJ Premium — Trend Operadora<br/>
📊 Dados atualizados automaticamente do Jira<br/>
🔄 Atualização: Diária | 🖥️ Servidor: Ativo<br/>
Versão 2.0 — Design Premium
</p>
`;

fs.writeFileSync(path.join(__dirname, 'confluence-content.html'), html, 'utf8');
console.log('✅ confluence-content.html PREMIUM gerado!');
console.log(`   ${(html.length / 1024).toFixed(1)} KB\n`);
console.log('🎨 Agora com:');
console.log('   ✓ Painel azul Trend no topo');
console.log('   ✓ Layout compatível com Confluence');
console.log('   ✓ Tabelas estruturadas');
console.log('   ✓ Indicadores visuais (cores de alerta)\n');
console.log('⏭️  Próxima etapa: node publish-confluence.js\n');
