#!/usr/bin/env node
/**
 * generate-confluence-piloto.js — Opção 1 piloto estruturada para Opção 3
 *
 * AGORA (Opção 1):
 * - Link destacado pro painel completo
 * - 3 Visões com dados tabulares
 * - Estrutura limpa
 *
 * DEPOIS (Opção 3 pós-férias):
 * - Adicionar imagens nos placeholders <!-- IMAGE: ... -->
 * - Transformar em accordion/tabs
 * - Upload de attachments
 *
 * Salva: confluence-piloto.html
 * Uso: node generate-confluence-piloto.js
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

// Função para embutir imagem como base64
function embedImage(name) {
  const screenshotsDir = path.join(__dirname, 'dist', 'screenshots');
  let file = null;
  ['temas', 'analistas', 'gdis'].forEach(dir => {
    const f = path.join(screenshotsDir, dir, `${name}.png`);
    if (fs.existsSync(f)) file = f;
  });
  if (!file || !fs.existsSync(file)) return '';
  const data = fs.readFileSync(file);
  const base64 = data.toString('base64');
  return `data:image/png;base64,${base64}`;
}

let html = `<p><em>📅 Atualizado em ${new Date().toLocaleString('pt-BR')}</em></p>

<p><strong>📊 PAINEL SDPREJ COM GRÁFICOS INTERATIVOS</strong></p>
<p><a href="file:///${painel_path.replace(/\\/g, '/')}" target="_blank"><strong>🔗 Abrir painel completo com navegação por abas e gráficos</strong></a></p>
<p style="font-size: 12px; color: #666;">Clique para ver as visões Temas, Analistas e GDIS com todos os gráficos interativos</p>

<hr/>

<hr/>

<h2>📊 RESUMO EXECUTIVO</h2>
<ac:structured-macro ac:name="panel">
<ac:rich-text-body>
<table>
<tbody>
<tr>
<td style="text-align: center;"><strong style="font-size: 18px; color: #0052cc;">${nfInt(DT.kpis.total)}</strong><br/><span style="font-size: 12px;">Chamados em Análise</span></td>
<td style="text-align: center;"><strong style="font-size: 18px; color: #0052cc;">${nfBRL(DT.kpis.valorTotal)}</strong><br/><span style="font-size: 12px;">Valor Reclamado</span></td>
<td style="text-align: center;"><strong style="font-size: 18px; color: #de350b;">${nfInt(DT.kpis.acima180d)}</strong><br/><span style="font-size: 12px;">Acima de 180 dias</span></td>
<td style="text-align: center;"><strong style="font-size: 18px; color: #0052cc;">${nfInt(DA.fila.length)}</strong><br/><span style="font-size: 12px;">Parados em TI</span></td>
<td style="text-align: center;"><strong style="font-size: 18px; color: #de350b;">${nfBRL(filaTotal)}</strong><br/><span style="font-size: 12px;">Valor Retido em TI</span></td>
</tr>
</tbody>
</table>
</ac:rich-text-body>
</ac:structured-macro>

<hr/>

<h2>🖼️ GRÁFICOS PRINCIPAIS</h2>

<h3>Visão 1: Temas</h3>
${(() => {
  const img = embedImage('temas-tema');
  return img ? `<img src="${img}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; margin: 12px 0;">` : '';
})()}

<h3>Visão 2: Analistas / Parados em TI</h3>
${(() => {
  const img = embedImage('analistas-timeline');
  return img ? `<img src="${img}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; margin: 12px 0;">` : '';
})()}

<h3>Visão 3: Vínculo com GDIS</h3>
${(() => {
  const img = embedImage('gdis-situacao');
  return img ? `<img src="${img}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; margin: 12px 0;">` : '';
})()}

<hr/>

<h1>📋 VISÃO 1: TEMAS</h1>
<p>Classificação dos chamados pelo padrão derivado do resumo.</p>

<!-- ESTRUTURA PARA OPÇÃO 3: IMAGENS AQUI -->
<!-- IMAGE: temas-tema.png - Tema Padrão Derivado -->
<!-- IMAGE: temas-area.png - Área Identificadora -->
<!-- IMAGE: temas-fornecedor.png - Fornecedores -->
<!-- IMAGE: temas-aging.png - Aging -->
<!-- IMAGE: temas-mensal.png - Mensal -->

<h3>📌 Top 15 Chamados por Valor</h3>
<table>
<tbody>
<tr><th>Chave</th><th>Tema</th><th>Área</th><th>Fornecedor</th><th>Dias</th><th>Valor R$</th></tr>
${DT.issues.sort((a, b) => b.valor - a.valor).slice(0, 15).map(i => `
<tr>
<td><strong><ac:link><ri:page ri:content-title="SDPREJ-${i.key.split('-')[1]}" />${esc(i.key)}</ac:link></strong></td>
<td>${esc(i.temaDerivado)}</td>
<td>${esc((i.areaFalha || '').replace(/\s*-\s*prejuí[zs]o\s*$/i, ''))}</td>
<td>${esc((i.fornecedor || '').substring(0, 20))}</td>
<td class="num">${nfInt(i.diasAberto)}</td>
<td style="text-align: right; background: #fff7d6;"><strong>${nfBRL(i.valor)}</strong></td>
</tr>`).join('')}
</tbody>
</table>

<h3>Distribuição por Tema</h3>
<table>
<tbody>
<tr><th>Tema</th><th>Chamados</th><th>Valor R$</th></tr>
${DT.temas.map(t => `
<tr>
<td>${esc(t.name)}</td>
<td class="num">${nfInt(t.count)}</td>
<td style="text-align: right;"><strong>${nfBRL(t.valor)}</strong></td>
</tr>`).join('')}
</tbody>
</table>

<hr/>

<h1>👤 VISÃO 2: ANALISTAS / PARADOS EM TI</h1>
<p>Produtividade por analista e fila de espera em conferência.</p>

<!-- ESTRUTURA PARA OPÇÃO 3: IMAGENS AQUI -->
<!-- IMAGE: analistas-timeline.png - Timeline por Mês -->
<!-- IMAGE: analistas-ritmo.png - Ritmo por Analista -->
<!-- IMAGE: analistas-fila.png - Fila por Faixa de Dias -->

<h3>🔴 PARADOS EM TI (CONFERÊNCIA) — MAIOR PRIORIDADE</h3>
<p><strong>${nfInt(DA.fila.length)} chamados aguardando supervisão</strong> • Total: <strong>${nfBRL(filaTotal)}</strong></p>
<table>
<tbody>
<tr><th>Chave</th><th>Analista</th><th>Dias na Fila</th><th>Valor R$</th></tr>
${DA.fila.sort((a, b) => b.diasNaFila - a.diasNaFila).slice(0, 12).map(f => `
<tr>
<td><strong><ac:link><ri:page ri:content-title="${esc(f.key)}" />${esc(f.key)}</ac:link></strong></td>
<td>${esc(f.enviadoPor)}</td>
<td class="num" style="background: ${f.diasNaFila > 180 ? '#ffebee' : ''};">${nfInt(f.diasNaFila)}</td>
<td style="text-align: right; background: #fff7d6;"><strong>${nfBRL(f.valor)}</strong></td>
</tr>`).join('')}
</tbody>
</table>

<h3>Trocas de Área (Reatribuições)</h3>
<table>
<tbody>
<tr><th>De</th><th>Para</th><th>Vezes</th></tr>
${(() => {
  const m = new Map();
  DA.areas.forEach(a => {
    const k = a.de + ' → ' + a.para;
    m.set(k, (m.get(k) || 0) + 1);
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([fluxo, count]) => {
      const [de, para] = fluxo.split(' → ');
      return `<tr><td>${esc(de)}</td><td>${esc(para)}</td><td class="num">${count}</td></tr>`;
    }).join('');
})()}
</tbody>
</table>

<hr/>

<h1>🔗 VISÃO 3: VÍNCULO COM GDIS</h1>
<p>Rastreamento dos chamados no GDIS e situação de cada incidente.</p>

<!-- ESTRUTURA PARA OPÇÃO 3: IMAGENS AQUI -->
<!-- IMAGE: gdis-situacao.png - Situação do GDIS -->
<!-- IMAGE: gdis-etapa.png - Etapa do SDPREJ -->
<!-- IMAGE: gdis-nivel.png - Nível de Escalação -->

<h3>📌 Categorias de GDIS (Top 10)</h3>
<table>
<tbody>
<tr><th>Situação / Categoria</th><th>Chamados</th><th>Valor R$</th></tr>
${(() => {
  const m = new Map();
  GD.rows.forEach(r => {
    const gstat = r[7] >= 0 ? GD.gsts[r[7]] : '';
    const bk = r[6];
    const label = gstat || (['nf', 'oth', 'txt', 'vaz'].includes(bk) ?
      {nf:'GDIS não localizado', oth:'Outro projeto', txt:'Texto livre', vaz:'Campo vazio'}[bk] : 'Sem classificação');
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

<h3>GDIS com Múltiplos Prejuízos</h3>
<p><em>Um GDIS que gera vários chamados — resolver um fecha todos.</em></p>
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
    .slice(0, 8)
    .map(([gdis, e]) => `<tr><td><strong><ac:link><ri:page ri:content-title="${esc(gdis)}" />${esc(gdis)}</ac:link></strong></td><td class="num">${nfInt(e.n)}</td><td style="text-align: right;"><strong>${nfBRL(e.v)}</strong></td></tr>`)
    .join('');
})()}
</tbody>
</table>

<p style="font-size: 11px; color: #999;">
<br/>
<strong>📝 NOTAS SOBRE ESTA ESTRUTURA:</strong><br/>
Seções marcadas com <code>&lt;!-- IMAGE: ... --&gt;</code> receberão gráficos com imagens após retorno de férias.<br/>
Os comentários indicam exatamente onde cada screenshot será inserido na Opção 3.
</p>
`;

fs.writeFileSync(path.join(__dirname, 'confluence-piloto.html'), html, 'utf8');
console.log('✅ confluence-piloto.html gerado com sucesso!');
console.log(`   ${(html.length / 1024).toFixed(1)} KB\n`);
console.log('📝 Estrutura pronta para Opção 3 (pós-férias)');
console.log('   - Comentários indicam onde as imagens vão\n');
