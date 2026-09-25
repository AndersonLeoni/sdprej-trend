#!/usr/bin/env node
/**
 * generate-confluence-content.js — gera conteúdo com 3 visões + screenshots
 *
 * Estrutura:
 * 1. Resumo Executivo (KPIs)
 * 2. Visão Temas (6 gráficos + tabelas)
 * 3. Visão Analistas (4 gráficos + tabelas)
 * 4. Visão GDIS (4 gráficos + tabelas)
 *
 * Salva: confluence-content.html
 * Uso: node generate-confluence-content.js
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

// Função para embutir imagem como base64
function embedImage(name) {
  const screenshotsDir = path.join(__dirname, 'dist', 'screenshots');
  let file = null;

  // Procura o arquivo em cada subdiretório
  ['temas', 'analistas', 'gdis'].forEach(dir => {
    const f = path.join(screenshotsDir, dir, `${name}.png`);
    if (fs.existsSync(f)) file = f;
  });

  if (!file || !fs.existsSync(file)) {
    return `<!-- Screenshot não encontrado: ${name} -->`;
  }

  const data = fs.readFileSync(file);
  const base64 = data.toString('base64');
  return `<img src="data:image/png;base64,${base64}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 3px; margin: 12px 0;">`;
}

const filaTotal = DA.fila.reduce((s, f) => s + f.valor, 0);

let html = `<p><em>📅 Atualizado em ${new Date().toLocaleString('pt-BR')}</em></p>

<h2>📊 RESUMO EXECUTIVO</h2>
<ac:structured-macro ac:name="panel">
<ac:rich-text-body>
<p><strong style="font-size: 18px; color: #0052cc;">Chamados em Análise:</strong> <strong style="font-size: 20px;">${nfInt(DT.kpis.total)}</strong> <em>aguardando parecer da TI</em></p>
<p><strong style="font-size: 18px; color: #0052cc;">Valor Reclamado:</strong> <strong style="font-size: 20px;">${nfBRL(DT.kpis.valorTotal)}</strong> <em>soma de Prejuízo</em></p>
<p><strong style="font-size: 18px; color: #de350b;">⚠️ Acima de 180 dias:</strong> <strong style="font-size: 20px; color: #de350b;">${nfInt(DT.kpis.acima180d)}</strong> <em>${DT.kpis.total ? Math.round(DT.kpis.acima180d / DT.kpis.total * 100) : 0}% — risco de prescrição</em></p>
<p><strong style="font-size: 18px; color: #0052cc;">Parados em Conferência:</strong> <strong style="font-size: 20px;">${nfInt(DA.fila.length)}</strong> <em>aguardando supervisão</em></p>
<p><strong style="font-size: 18px; color: #de350b;">🔴 Valor Retido em TI:</strong> <strong style="font-size: 20px; color: #de350b;">${nfBRL(filaTotal)}</strong> <em>prejudício sem análise</em></p>
<p><strong style="font-size: 18px; color: #0052cc;">Ciclos Concluídos:</strong> <strong style="font-size: 20px;">${nfInt(DA.ciclos.length)}</strong> <em>análises entregues</em></p>
</ac:rich-text-body>
</ac:structured-macro>

<hr/>

<h1>📋 VISÃO 1: TEMAS</h1>
<p>Classificação dos chamados pelo padrão derivado do resumo. Inclui tema, problema, falha, área, fornecedor e aging.</p>

<h3>Tema - Padrão Derivado</h3>
${embedImage('temas-tema')}

<h3>Problema</h3>
${embedImage('temas-area')}

<h3>Fornecedores / Hotéis</h3>
${embedImage('temas-fornecedor')}

<h3>Aging - Dias Aberto</h3>
${embedImage('temas-aging')}

<h3>Mensal - Valor Reclamado</h3>
${embedImage('temas-mensal')}

<h3>📌 Chamados em Análise (Top 20 por valor)</h3>
<table>
<tbody>
<tr><th>Chave</th><th>Tema</th><th>Área</th><th>Fornecedor</th><th>Dias</th><th>Valor R$</th></tr>
${DT.issues.sort((a, b) => b.valor - a.valor).slice(0, 20).map(i => `
<tr>
<td><strong><a href="https://cvccorp.atlassian.net/browse/${esc(i.key)}">${esc(i.key)}</a></strong></td>
<td>${esc(i.temaDerivado)}</td>
<td>${esc((i.areaFalha || '').replace(/\s*-\s*prejuí[zs]o\s*$/i, ''))}</td>
<td>${esc(i.fornecedor || '—')}</td>
<td class="num">${nfInt(i.diasAberto)}</td>
<td style="text-align: right; background: #fff7d6;"><strong>${nfBRL(i.valor)}</strong></td>
</tr>`).join('')}
</tbody>
</table>

<hr/>

<h1>👤 VISÃO 2: ANALISTAS / PARADOS EM TI</h1>
<p>Produtividade por analista, timeline mensal e fila de espera em conferência.</p>

<h3>Timeline - Ciclos por Mês</h3>
${embedImage('analistas-timeline')}

<h3>Ritmo - Ciclos por Analista</h3>
${embedImage('analistas-ritmo')}

<h3>Fila - Faixa de Dias Aguardando</h3>
${embedImage('analistas-fila')}

<h3>🔴 PARADOS EM TI (CONFERÊNCIA) — MAIOR PRIORIDADE</h3>
<p>Chamados que saíram da análise e aguardam parecer da supervisão. Ordenados pelo maior tempo de espera.</p>
<table>
<tbody>
<tr><th>Chave</th><th>Analista</th><th>Dias na Fila</th><th>Valor R$</th></tr>
${DA.fila.sort((a, b) => b.diasNaFila - a.diasNaFila).slice(0, 15).map(f => `
<tr>
<td><strong><a href="https://cvccorp.atlassian.net/browse/${esc(f.key)}">${esc(f.key)}</a></strong></td>
<td>${esc(f.enviadoPor)}</td>
<td class="num" style="background: ${f.diasNaFila > 180 ? '#ffebee' : ''};">${nfInt(f.diasNaFila)}</td>
<td style="text-align: right; background: #fff7d6;"><strong>${nfBRL(f.valor)}</strong></td>
</tr>`).join('')}
</tbody>
</table>
<p><em>Mostrando top 15. Total de <strong>${nfInt(DA.fila.length)}</strong> chamados parados.</em></p>

<h3>Trocas de Área (Top 10)</h3>
<table>
<tbody>
<tr><th>Autor</th><th>De</th><th>Para</th><th>Mês</th></tr>
${(() => {
  const m = new Map();
  DA.areas.forEach(a => {
    const k = a.de + ' → ' + a.para;
    m.set(k, (m.get(k) || 0) + 1);
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([fluxo, count]) => {
      const [de, para] = fluxo.split(' → ');
      const exemplo = DA.areas.find(a => a.de === de && a.para === para);
      return `<tr><td>${esc(exemplo?.autor || '—')}</td><td>${esc(de)}</td><td>${esc(para)}</td><td>${count} vezes</td></tr>`;
    }).join('');
})()}
</tbody>
</table>

<hr/>

<h1>🔗 VISÃO 3: VÍNCULO COM GDIS</h1>
<p>Rastreamento dos chamados no GDIS e situação atual de cada incidente.</p>

<h3>Situação do GDIS</h3>
${embedImage('gdis-situacao')}

<h3>Etapa do SDPREJ</h3>
${embedImage('gdis-etapa')}

<h3>Nível de Escalação (N1/N2/N3)</h3>
${embedImage('gdis-nivel')}

<h3>📌 Categorias de GDIS (Top 10)</h3>
<table>
<tbody>
<tr><th>Situação / Categoria</th><th>Chamados</th><th>Valor R$</th></tr>
${(() => {
  // Agrupa por gstat
  const m = new Map();
  GD.rows.forEach(r => {
    const gstat = r[7] >= 0 ? GD.gsts[r[7]] : (GD.rows[0] ? 'Sem status' : '');
    const bk = r[6];
    const label = gstat || (['nf', 'oth', 'txt', 'vaz'].includes(bk) ?
      {nf:'GDIS não localizado', oth:'Outro projeto', txt:'Texto livre', vaz:'Campo vazio'}[bk] : '');
    if (label) {
      const e = m.get(label) || {n: 0, v: 0};
      e.n++; e.v += r[3]; m.set(label, e);
    }
  });
  return [...m.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 10)
    .map(([label, e]) => `<tr><td>${esc(label)}</td><td class="num">${nfInt(e.n)}</td><td style="text-align: right;"><strong>${nfBRL(e.v)}</strong></td></tr>`)
    .join('');
})()}
</tbody>
</table>

<h3>GDIS com Múltiplos Prejuízos (Top 5)</h3>
<p>Um GDIS que gera vários chamados — resolver um fecha todos.</p>
<table>
<tbody>
<tr><th>GDIS</th><th>Situação</th><th>Chamados</th><th>Valor R$</th></tr>
${(() => {
  const m = new Map();
  GD.rows.filter(r => /^GDIS-\d+$/.test(r[5] || '')).forEach(r => {
    const g = r[5];
    const e = m.get(g) || {keys: new Set(), cls: r[6], v: 0};
    e.keys.add('SDPREJ-' + r[0]);
    e.v += r[3];
    m.set(g, e);
  });
  return [...m.entries()]
    .filter(([, e]) => e.keys.size > 1)
    .sort((a, b) => b[1].keys.size - a[1].keys.size)
    .slice(0, 5)
    .map(([gdis, e]) => `<tr><td><strong><a href="https://cvccorp.atlassian.net/browse/${esc(gdis)}">${esc(gdis)}</a></strong></td><td>${e.cls}</td><td class="num">${nfInt(e.keys.size)}</td><td style="text-align: right;"><strong>${nfBRL(e.v)}</strong></td></tr>`)
    .join('');
})()}
</tbody>
</table>
`;

fs.writeFileSync(path.join(__dirname, 'confluence-content.html'), html, 'utf8');
console.log('✅ confluence-content.html gerado com sucesso!');
console.log(`   ${(html.length / 1024 / 1024).toFixed(1)} MB — com screenshots embuti dos + tabelas\n`);
