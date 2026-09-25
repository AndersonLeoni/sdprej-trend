#!/usr/bin/env node
/**
 * generate-confluence-com-imagens.js — Opção B visual com screenshots do Confluence
 *
 * Lê as URLs dos attachments do screenshots-manifest.json
 * e monta um relatório polido com imagens + dados em Confluence.
 *
 * Uso: node generate-confluence-com-imagens.js
 */

const fs = require('fs');
const path = require('path');

const DT = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'temas.json'), 'utf8'));
const DA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'analistas.json'), 'utf8'));
const GD = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'gdis.json'), 'utf8'));

const manifestPath = path.join(__dirname, 'dist', 'screenshots-manifest.json');
let screenshots = {};

if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.screenshots.forEach(s => {
    screenshots[s.title] = s.url;
  });
}

const nfBRL = v => new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL', maximumFractionDigits: 0}).format(v);
const nfInt = v => new Intl.NumberFormat('pt-BR').format(Math.round(v));
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[c]));

function img(title) {
  if (!screenshots[title]) return `<!-- Screenshot não encontrado: ${title} -->`;
  // Encontra o filename baseado no título
  const filenameMap = {
    'KPIs - Resumo Temas': 'temas-kpis.png',
    'Tema - Padrão Derivado': 'temas-tema.png',
    'Área Identificadora': 'temas-area.png',
    'Fornecedores / Hotéis': 'temas-fornecedor.png',
    'Aging - Dias Aberto': 'temas-aging.png',
    'Mensal - Valor': 'temas-mensal.png',
    'KPIs - Resumo Analistas': 'analistas-kpis.png',
    'Timeline - Ciclos por Mês': 'analistas-timeline.png',
    'Ritmo - Ciclos por Analista': 'analistas-ritmo.png',
    'Fila - Faixa de Dias': 'analistas-fila.png',
    'KPIs - Resumo GDIS': 'gdis-kpis.png',
    'Situação do GDIS': 'gdis-situacao.png',
    'Etapa do SDPREJ': 'gdis-etapa.png',
    'Nível de Escalação': 'gdis-nivel.png'
  };
  const filename = filenameMap[title] || title;
  // Usa a macro de attachment do Confluence
  return `<p><ac:image ac:height="400"><ri:attachment ri:filename="${esc(filename)}" /></ac:image></p>`;
}

const filaTotal = DA.fila.reduce((s, f) => s + f.valor, 0);
const painel_path = path.join(__dirname, 'dist', 'SDPREJ_Painel.html');

let html = `<p><em>📅 Atualizado: ${new Date().toLocaleString('pt-BR')}</em></p>

<ac:structured-macro ac:name="info">
<ac:rich-text-body>
<p><strong>📊 Painel SDPREJ com Gráficos Interativos</strong></p>
<p><a href="file:///${painel_path.replace(/\\/g, '/')}" target="_blank"><strong>🔗 Abrir painel completo</strong></a></p>
<p><em>Com navegação por abas, filtros e gráficos dinâmicos</em></p>
</ac:rich-text-body>
</ac:structured-macro>

<h2>📊 RESUMO EXECUTIVO</h2>
<table>
<tbody>
<tr>
<td><strong>${nfInt(DT.kpis.total)}</strong><br/><span style="font-size: 11px;">Chamados em Análise</span></td>
<td><strong>${nfBRL(DT.kpis.valorTotal)}</strong><br/><span style="font-size: 11px;">Valor Reclamado</span></td>
<td style="background: #ffe0e0;"><strong style="color: #c00;">${nfInt(DT.kpis.acima180d)}</strong><br/><span style="font-size: 11px;">Acima de 180d</span></td>
<td><strong>${nfInt(DA.fila.length)}</strong><br/><span style="font-size: 11px;">Parados em TI</span></td>
<td style="background: #ffe0e0;"><strong style="color: #c00;">${nfBRL(filaTotal)}</strong><br/><span style="font-size: 11px;">Valor Retido</span></td>
<td><strong>${nfInt(DA.ciclos.length)}</strong><br/><span style="font-size: 11px;">Ciclos</span></td>
</tr>
</tbody>
</table>

<hr/>

<h1>📋 VISÃO 1: TEMAS</h1>
<p>Classificação dos chamados pelo padrão derivado.</p>

<h3>Tema - Padrão Derivado</h3>
${img('Tema - Padrão Derivado')}

<h3>Área Identificadora</h3>
${img('Área Identificadora')}

<h3>Fornecedores / Hotéis</h3>
${img('Fornecedores / Hotéis')}

<h3>Aging - Dias Aberto</h3>
${img('Aging - Dias Aberto')}

<h3>Mensal - Valor Reclamado</h3>
${img('Mensal - Valor')}

<h3>📌 Top 10 Chamados por Valor</h3>
<table>
<tbody>
<tr><th>Chave</th><th>Tema</th><th>Dias</th><th>Valor R$</th></tr>
${DT.issues.sort((a, b) => b.valor - a.valor).slice(0, 10).map(i => `
<tr>
<td><strong>${esc(i.key)}</strong></td>
<td>${esc(i.temaDerivado.substring(0, 30))}</td>
<td>${nfInt(i.diasAberto)}</td>
<td style="text-align: right;"><strong>${nfBRL(i.valor)}</strong></td>
</tr>`).join('')}
</tbody>
</table>

<hr/>

<h1>👤 VISÃO 2: ANALISTAS / PARADOS EM TI</h1>
<p><strong>🔴 ${nfInt(DA.fila.length)} CHAMADOS AGUARDANDO SUPERVISÃO</strong> — Total: <strong>${nfBRL(filaTotal)}</strong></p>

<h3>Timeline - Ciclos por Mês</h3>
${img('Timeline - Ciclos por Mês')}

<h3>Ritmo - Ciclos por Analista</h3>
${img('Ritmo - Ciclos por Analista')}

<h3>Fila - Faixa de Dias</h3>
${img('Fila - Faixa de Dias')}

<h3>Top 10 - Maior Tempo de Espera</h3>
<table>
<tbody>
<tr><th>Chave</th><th>Dias na Fila</th><th>Valor R$</th></tr>
${DA.fila.sort((a, b) => b.diasNaFila - a.diasNaFila).slice(0, 10).map(f => `
<tr>
<td><strong>${esc(f.key)}</strong></td>
<td style="text-align: right; ${f.diasNaFila > 180 ? 'background: #ffe0e0;' : ''}">${nfInt(f.diasNaFila)}</td>
<td style="text-align: right;"><strong>${nfBRL(f.valor)}</strong></td>
</tr>`).join('')}
</tbody>
</table>

<hr/>

<h1>🔗 VISÃO 3: VÍNCULO COM GDIS</h1>
<p>Rastreamento dos chamados no GDIS.</p>

<h3>Situação do GDIS</h3>
${img('Situação do GDIS')}

<h3>Etapa do SDPREJ</h3>
${img('Etapa do SDPREJ')}

<h3>Nível de Escalação</h3>
${img('Nível de Escalação')}

<h3>📌 Top 10 Categorias</h3>
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
    .map(([label, e]) => `<tr><td>${esc(label)}</td><td>${nfInt(e.n)}</td><td style="text-align: right;"><strong>${nfBRL(e.v)}</strong></td></tr>`)
    .join('');
})()}
</tbody>
</table>

<hr/>

<p style="font-size: 10px; color: #999; margin-top: 24px;">
📊 <strong>Relatório Visual SDPREJ</strong> • Gráficos com screenshots • Dados atualizados diariamente • Estrutura para evolução contínua
</p>
`;

fs.writeFileSync(path.join(__dirname, 'confluence-content.html'), html, 'utf8');
console.log('✅ confluence-content.html gerado com imagens!');
console.log(`   ${(html.length / 1024).toFixed(1)} KB\n`);
console.log('⏭️  Próxima etapa: node upload-screenshots.js && node publish-confluence.js');
