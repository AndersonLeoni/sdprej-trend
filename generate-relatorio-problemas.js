#!/usr/bin/env node
/**
 * generate-relatorio-problemas.js — Gera relatório de GDIS/SUST para Confluence
 *
 * Conteúdo:
 * - Problemas abertos
 * - Em correção (nível 3)
 * - Corrigidos
 * - Impacto em SDPREJ
 *
 * Uso: node generate-relatorio-problemas.js
 */

const fs = require('fs');
const path = require('path');

const DT = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'temas.json'), 'utf8'));
const PR = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'problemas.json'), 'utf8'));

const nfInt = v => new Intl.NumberFormat('pt-BR').format(Math.round(v));
const nfBRL = v => new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL', maximumFractionDigits: 0}).format(v);
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[c]));

const statusEmoji = {
  aberto: '🔴 ABERTO',
  em_correcao: '🟡 EM CORREÇÃO',
  corrigido: '✅ CORRIGIDO'
};

let html = `<p><strong>📋 RELATÓRIO — GDIS/SUST E IMPACTO EM SDPREJ</strong></p>
<p style="font-size: 12px; color: #666;">Trend Operadora — Rastreamento de problemas identificados e sua correlação com prejuízos | 📅 ${new Date().toLocaleString('pt-BR')}</p>

<h2 style="color: #003366; border-left: 4px solid #FF6B35; padding-left: 12px; margin-top: 16px;">📊 RESUMO EXECUTIVO</h2>

<table style="width: 100%; border-spacing: 8px; border-collapse: separate;">
<tbody>
<tr>
<td style="background: #ffe0e0; border-left: 4px solid #d32f2f; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 28px; font-weight: bold; color: #c62828;">${nfInt(PR.aberto.length)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>🔴 Abertos</strong></div>
<div style="font-size: 10px; color: #666;">Aguardando ação</div>
</td>

<td style="background: #fff3e0; border-left: 4px solid #f57c00; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 28px; font-weight: bold; color: #e65100;">${nfInt(PR.em_correcao.length)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>🟡 Em Correção</strong></div>
<div style="font-size: 10px; color: #666;">Em progresso (Nível 3)</div>
</td>

<td style="background: #e8f5e9; border-left: 4px solid #388e3c; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 28px; font-weight: bold; color: #2e7d32;">${nfInt(PR.corrigido.length)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>✅ Corrigidos</strong></div>
<div style="font-size: 10px; color: #666;">Resolvidos</div>
</td>

<td style="background: #ffebee; border-left: 4px solid #d32f2f; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 24px; font-weight: bold; color: #c62828;">${nfInt(PR.sumario.totalChamadosSdprej)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>SDPREJ Impactados</strong></div>
<div style="font-size: 10px; color: #666;">Prejudicados</div>
</td>

<td style="background: #ffebee; border-left: 4px solid #d32f2f; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 20px; font-weight: bold; color: #c62828;">${nfBRL(PR.sumario.totalValorImpactado)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>Valor Impactado</strong></div>
<div style="font-size: 10px; color: #666;">Em prejuízo</div>
</td>
</tr>
</tbody>
</table>

<hr/>

<h1>🔴 PROBLEMAS ABERTOS</h1>
<p>Problemas identificados que aguardam ação.</p>

${PR.aberto.length ? `
<table>
<tbody>
<tr><th>Chave</th><th>Tipo</th><th>Prioridade</th><th>SDPREJ Impactados</th><th>Valor Impactado</th><th>Dias em Aberto</th></tr>
${PR.aberto.map(p => `
<tr>
<td><a href="${esc(p.link)}" target="_blank"><strong>${esc(p.chave)}</strong></a></td>
<td>${esc(p.tipo)}</td>
<td>${esc(p.prioridade)}</td>
<td>${nfInt(p.quantidadeSdprej)}</td>
<td style="text-align: right; color: #c62828; font-weight: bold;">${nfBRL(p.valorTotalImpactado)}</td>
<td><strong>${p.diasAberto}d</strong></td>
</tr>`).join('')}
</tbody>
</table>
` : '<p style="color: #999; font-style: italic;">Nenhum problema aberto.</p>'}

<hr/>

<h1>🟡 EM CORREÇÃO (NÍVEL 3)</h1>
<p>Problemas em progresso. Correlação com chamados SDPREJ.</p>

${PR.em_correcao.length ? `
<table>
<tbody>
<tr><th>Chave</th><th>Descrição</th><th>SDPREJ Impactados</th><th>Valor Impactado</th><th>Status</th></tr>
${PR.em_correcao.map(p => `
<tr>
<td><a href="${esc(p.link)}" target="_blank"><strong>${esc(p.chave)}</strong></a></td>
<td>${esc(p.summary.substring(0, 50))}</td>
<td>${nfInt(p.quantidadeSdprej)}</td>
<td style="text-align: right; color: #e65100; font-weight: bold;">${nfBRL(p.valorTotalImpactado)}</td>
<td>${statusEmoji[p.status] || p.status}</td>
</tr>`).join('')}
</tbody>
</table>
` : '<p style="color: #999; font-style: italic;">Nenhum problema em correção.</p>'}

<hr/>

<h1>✅ CORRIGIDOS</h1>
<p>Problemas que já foram resolvidos.</p>

${PR.corrigido.length ? `
<table>
<tbody>
<tr><th>Chave</th><th>Resolvido em</th><th>SDPREJ Impactados</th><th>Valor que foi Impactado</th></tr>
${PR.corrigido.slice(0, 20).map(p => `
<tr>
<td><a href="${esc(p.link)}" target="_blank"><strong>${esc(p.chave)}</strong></a></td>
<td>${p.resolvidoEm || p.atualizadoEm}</td>
<td>${nfInt(p.quantidadeSdprej)}</td>
<td style="text-align: right; color: #2e7d32; font-weight: bold;">${nfBRL(p.valorTotalImpactado)}</td>
</tr>`).join('')}
</tbody>
</table>
` : '<p style="color: #999; font-style: italic;">Nenhum problema corrigido.</p>'}

<hr/>

<p style="font-size: 11px; color: #999; text-align: center; margin-top: 32px;">
📋 Relatório GDIS/SUST — Trend Operadora<br/>
🔗 Dados sincronizados do Jira em tempo real<br/>
🔄 Atualização: Diária | 📅 Gerado: ${new Date().toLocaleString('pt-BR')}<br/>
</p>
`;

fs.writeFileSync(path.join(__dirname, 'relatorio-problemas.html'), html, 'utf8');
console.log('✅ relatorio-problemas.html gerado!');
console.log(`   ${(html.length / 1024).toFixed(1)} KB\n`);
console.log('📊 Resumo:');
console.log(`   Abertos: ${PR.aberto.length}`);
console.log(`   Em Correção: ${PR.em_correcao.length}`);
console.log(`   Corrigidos: ${PR.corrigido.length}`);
console.log(`   SDPREJ Impactados: ${PR.sumario.totalChamadosSdprej}`);
console.log(`   Valor Impactado: ${nfBRL(PR.sumario.totalValorImpactado)}\n`);
