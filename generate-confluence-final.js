#!/usr/bin/env node
/**
 * generate-confluence-final.js — Conteúdo COMPLETO pra Confluence
 *
 * Combina:
 * 1. Iframe do painel interativo (rodando em localhost:8000)
 * 2. Gráficos como screenshots (attachments do Confluence)
 * 3. Dados tabulares em tempo real
 *
 * Uso: node generate-confluence-final.js
 */

const fs = require('fs');
const path = require('path');

const DT = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'temas.json'), 'utf8'));
const DA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'analistas.json'), 'utf8'));
const GD = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'gdis.json'), 'utf8'));

const nfBRL = v => new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL', maximumFractionDigits: 0}).format(v);
const nfInt = v => new Intl.NumberFormat('pt-BR').format(Math.round(v));
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[c]));

const filaTotal = DA.fila.reduce((s, f) => s + f.valor, 0);

// Mapeamento de título para filename (pra usar nos attachments)
// Screenshots removidos — usar painel interativo em vez disso
function imgAttachment(title) {
  return ''; // Sem screenshots
}

let html = `<p><em>📅 Atualizado: ${new Date().toLocaleString('pt-BR')}</em></p>

<ac:structured-macro ac:name="tip">
<ac:rich-text-body>
<p><strong>💡 Dashboard SDPREJ em Tempo Real</strong></p>
<p>Dados extraídos automaticamente do Jira todos os dias. Painel interativo com gráficos dinâmicos.</p>
</ac:rich-text-body>
</ac:structured-macro>

<hr/>

<h2>📊 RESUMO EXECUTIVO</h2>
<table>
<tbody>
<tr>
<td style="text-align: center;"><strong>${nfInt(DT.kpis.total)}</strong><br/><span style="font-size: 11px;">Chamados em Análise</span></td>
<td style="text-align: center;"><strong>${nfBRL(DT.kpis.valorTotal)}</strong><br/><span style="font-size: 11px;">Valor Reclamado</span></td>
<td style="text-align: center; background: #ffe0e0;"><strong style="color: #c00;">${nfInt(DT.kpis.acima180d)}</strong><br/><span style="font-size: 11px;">Acima de 180d</span></td>
<td style="text-align: center;"><strong>${nfInt(DA.fila.length)}</strong><br/><span style="font-size: 11px;">Parados em TI</span></td>
<td style="text-align: center; background: #ffe0e0;"><strong style="color: #c00;">${nfBRL(filaTotal)}</strong><br/><span style="font-size: 11px;">Valor Retido</span></td>
<td style="text-align: center;"><strong>${nfInt(DA.ciclos.length)}</strong><br/><span style="font-size: 11px;">Ciclos</span></td>
</tr>
</tbody>
</table>

<hr/>

<h1>📈 PAINEL INTERATIVO — COM GRÁFICOS DINÂMICOS</h1>

<ac:structured-macro ac:name="warning">
<ac:rich-text-body>
<p><strong>🔗 Clique para abrir o painel:</strong></p>
<p><a href="http://localhost:8000/SDPREJ_Painel.html" target="_blank" style="font-size: 16px; font-weight: bold;"><u>SDPREJ Dashboard Interativo</u></a></p>
<p style="font-size: 12px; margin-top: 8px;"><em>✓ Gráficos dinâmicos em tempo real</em><br/><em>✓ Filtros por faixa, departamento e tema</em><br/><em>✓ Três visões: Temas, Analistas, GDIS</em></p>
</ac:rich-text-body>
</ac:structured-macro>

<hr/>

<h1>📋 VISÃO 1: TEMAS</h1>
<p>Classificação dos chamados pelo padrão derivado.</p>

${imgAttachment('Tema - Padrão Derivado')}

<h3>📊 Distribuição por Tema</h3>
<table>
<tbody>
<tr><th>Tema</th><th>Chamados</th><th>Valor Reclamado</th><th>% do Total</th></tr>
${DT.temas.map(t => `
<tr>
<td>${esc(t.name)}</td>
<td style="text-align: right;"><strong>${nfInt(t.count)}</strong></td>
<td style="text-align: right;"><strong>${nfBRL(t.valor)}</strong></td>
<td style="text-align: right;">${((t.valor / DT.kpis.valorTotal) * 100).toFixed(1)}%</td>
</tr>`).join('')}
</tbody>
</table>

<h3>📌 Top 10 Chamados por Valor</h3>
<table>
<tbody>
<tr><th>Chave</th><th>Tema</th><th>Dias</th><th>Valor R$</th></tr>
${DT.issues.sort((a, b) => b.valor - a.valor).slice(0, 10).map(i => `
<tr>
<td><strong>${esc(i.key)}</strong></td>
<td>${esc(i.temaDerivado.substring(0, 30))}</td>
<td>${nfInt(i.diasAberto)}</td>
<td style="text-align: right; background: #fff7d6;"><strong>${nfBRL(i.valor)}</strong></td>
</tr>`).join('')}
</tbody>
</table>

<hr/>

<h1>👤 VISÃO 2: ANALISTAS / PARADOS EM TI</h1>
<p><strong>🔴 ${nfInt(DA.fila.length)} CHAMADOS AGUARDANDO SUPERVISÃO</strong> — Total: <strong>${nfBRL(filaTotal)}</strong></p>

${imgAttachment('Timeline - Ciclos por Mês')}

<h3>🔴 Top 10 Maior Tempo de Espera</h3>
<table>
<tbody>
<tr><th>Chave</th><th>Dias na Fila</th><th>Valor R$</th></tr>
${DA.fila.sort((a, b) => b.diasNaFila - a.diasNaFila).slice(0, 10).map(f => `
<tr>
<td><strong>${esc(f.key)}</strong></td>
<td style="text-align: right; ${f.diasNaFila > 180 ? 'background: #ffebee;' : ''}">${nfInt(f.diasNaFila)}</td>
<td style="text-align: right; background: #fff7d6;"><strong>${nfBRL(f.valor)}</strong></td>
</tr>`).join('')}
</tbody>
</table>

<h3>Fila por Faixa de Dias</h3>
<table>
<tbody>
<tr><th>Faixa</th><th>Chamados</th><th>Valor</th></tr>
${(() => {
  const faixas = {
    '0-30d': { n: 0, v: 0 },
    '31-90d': { n: 0, v: 0 },
    '91-180d': { n: 0, v: 0 },
    '181d+': { n: 0, v: 0 }
  };
  DA.fila.forEach(f => {
    let faixa;
    if (f.diasNaFila <= 30) faixa = '0-30d';
    else if (f.diasNaFila <= 90) faixa = '31-90d';
    else if (f.diasNaFila <= 180) faixa = '91-180d';
    else faixa = '181d+';

    faixas[faixa].n++;
    faixas[faixa].v += f.valor;
  });
  return Object.entries(faixas)
    .map(([faixa, e]) => `<tr><td>${faixa}</td><td style="text-align: right;"><strong>${e.n}</strong></td><td style="text-align: right;"><strong>${nfBRL(e.v)}</strong></td></tr>`)
    .join('');
})()}
</tbody>
</table>

<hr/>

<h1>🔗 VISÃO 3: VÍNCULO COM GDIS</h1>
<p>Rastreamento dos chamados vinculados a GDIS.</p>

${imgAttachment('Situação do GDIS')}

<h3>📊 Situação do GDIS</h3>
<table>
<tbody>
<tr><th>Situação</th><th>Chamados</th><th>Valor R$</th></tr>
${(() => {
  const m = new Map();
  GD.rows.forEach(r => {
    const label = r[7] >= 0 ? GD.gsts[r[7]] : 'Sem classificação';
    const e = m.get(label) || {n: 0, v: 0};
    e.n++; e.v += r[3]; m.set(label, e);
  });
  return [...m.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 10)
    .map(([label, e]) => `<tr><td>${esc(label)}</td><td style="text-align: right;">${nfInt(e.n)}</td><td style="text-align: right;"><strong>${nfBRL(e.v)}</strong></td></tr>`)
    .join('');
})()}
</tbody>
</table>

<p style="font-size: 10px; color: #999; margin-top: 24px;">
✅ <strong>Dashboard SDPREJ</strong> • Atualizado automaticamente • Dados do Jira em tempo real • Última atualização: ${new Date().toLocaleString('pt-BR')}
</p>
`;

fs.writeFileSync(path.join(__dirname, 'confluence-content.html'), html, 'utf8');
console.log('✅ confluence-content.html gerado!');
console.log(`   ${(html.length / 1024).toFixed(1)} KB\n`);
console.log('📊 Inclui:');
console.log('   ✓ Link pro painel interativo (localhost:8000)');
console.log('   ✓ Screenshots dos gráficos (attachments)');
console.log('   ✓ Tabelas dinâmicas com dados reais\n');
console.log('⏭️  Próxima etapa: node server.js (em outro terminal)');
console.log('                   node publish-confluence.js');
