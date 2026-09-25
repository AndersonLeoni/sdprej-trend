#!/usr/bin/env node
/**
 * generate-confluence-dinamico.js — Gera conteúdo Confluence com DADOS REAIS do Jira
 *
 * Usa os JSONs (temas.json, analistas.json, gdis.json) para tabelas dinâmicas.
 * Sem screenshots estáticos — dados ao vivo!
 *
 * Uso: node generate-confluence-dinamico.js
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
const painel_path = path.join(__dirname, 'dist', 'SDPREJ_Painel.html');

let html = `<p><em>📅 Atualizado: ${new Date().toLocaleString('pt-BR')}</em></p>

<ac:structured-macro ac:name="info">
<ac:rich-text-body>
<p><strong>📊 SDPREJ — Dashboard de Prejudícata ao Vivo</strong></p>
<p>Dados extraídos automaticamente do Jira em tempo real</p>
<p><a href="file:///${painel_path.replace(/\\/g, '/')}" target="_blank"><strong>🔗 Abrir painel interativo</strong></a> (gráficos dinâmicos com filtros)</p>
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

<h1>📋 VISÃO 1: TEMAS</h1>
<p>Classificação dos chamados pelo padrão derivado.</p>

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

<h3>📌 Top 15 Chamados por Valor</h3>
<table>
<tbody>
<tr><th>Chave</th><th>Tema</th><th>Área</th><th>Dias Aberto</th><th>Valor R$</th></tr>
${DT.issues.sort((a, b) => b.valor - a.valor).slice(0, 15).map(i => `
<tr>
<td><strong>${esc(i.key)}</strong></td>
<td>${esc(i.temaDerivado.substring(0, 25))}</td>
<td>${esc((i.areaFalha || '').replace(/\s*-\s*prejuí[zs]o\s*$/i, '').substring(0, 20))}</td>
<td style="text-align: right;">${nfInt(i.diasAberto)}</td>
<td style="text-align: right; background: #fff7d6;"><strong>${nfBRL(i.valor)}</strong></td>
</tr>`).join('')}
</tbody>
</table>

<hr/>

<h1>👤 VISÃO 2: ANALISTAS / PARADOS EM TI</h1>
<p><strong>🔴 ${nfInt(DA.fila.length)} CHAMADOS AGUARDANDO SUPERVISÃO</strong></p>

<h3>Timeline de Ciclos (Últimos 12 meses)</h3>
<table>
<tbody>
<tr><th>Mês</th><th>Ciclos Completados</th><th>Valor Processado</th></tr>
${(() => {
  const meses = {};
  DA.ciclos.forEach(c => {
    if (!meses[c.mes]) meses[c.mes] = { count: 0, valor: 0 };
    meses[c.mes].count++;
    meses[c.mes].valor += c.valor;
  });
  return Object.entries(meses)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([mes, e]) => `<tr><td>${mes}</td><td style="text-align: right;">${nfInt(e.count)}</td><td style="text-align: right;"><strong>${nfBRL(e.valor)}</strong></td></tr>`)
    .join('');
})()}
</tbody>
</table>

<h3>🔴 Chamados em Conferência — MAIOR PRIORIDADE</h3>
<p>Top 10 com maior tempo de espera</p>
<table>
<tbody>
<tr><th>Chave</th><th>Analista</th><th>Dias na Fila</th><th>Valor R$</th></tr>
${DA.fila.sort((a, b) => b.diasNaFila - a.diasNaFila).slice(0, 10).map(f => `
<tr>
<td><strong>${esc(f.key)}</strong></td>
<td>${esc(f.enviadoPor.substring(0, 20))}</td>
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

<h3>📊 Situação do GDIS</h3>
<table>
<tbody>
<tr><th>Situação</th><th>Chamados</th><th>Valor R$</th><th>% do Total</th></tr>
${(() => {
  const m = new Map();
  GD.rows.forEach(r => {
    const label = r[7] >= 0 ? GD.gsts[r[7]] : 'Sem classificação';
    const e = m.get(label) || {n: 0, v: 0};
    e.n++; e.v += r[3]; m.set(label, e);
  });
  return [...m.entries()].sort((a, b) => b[1].n - a[1].n)
    .map(([label, e]) => `<tr><td>${esc(label)}</td><td style="text-align: right;">${nfInt(e.n)}</td><td style="text-align: right;"><strong>${nfBRL(e.v)}</strong></td><td style="text-align: right;">${((e.v / DT.kpis.valorTotal) * 100).toFixed(1)}%</td></tr>`)
    .join('');
})()}
</tbody>
</table>

<h3>GDIS com Múltiplos Chamados</h3>
<p>Um GDIS que gera vários chamados — resolver um fecha todos.</p>
<table>
<tbody>
<tr><th>GDIS</th><th>Chamados</th><th>Valor R$</th></tr>
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
    .map(([gdis, e]) => `<tr><td><strong>${esc(gdis)}</strong></td><td style="text-align: right;">${nfInt(e.n)}</td><td style="text-align: right;"><strong>${nfBRL(e.v)}</strong></td></tr>`)
    .join('');
})()}
</tbody>
</table>

<hr/>

<p style="font-size: 10px; color: #999; margin-top: 24px;">
✅ <strong>Dashboard SDPREJ — Atualizado automaticamente</strong> • Dados extraídos do Jira • Atualização diária via automação
</p>
`;

fs.writeFileSync(path.join(__dirname, 'confluence-content.html'), html, 'utf8');
console.log('✅ confluence-content.html gerado com DADOS REAIS!');
console.log(`   ${(html.length / 1024).toFixed(1)} KB\n`);
console.log('📊 Conteúdo com tabelas dinâmicas (temas, analistas, GDIS)');
console.log('   Próxima etapa: node publish-confluence.js\n');
