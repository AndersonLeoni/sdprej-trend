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
const pcn = (a, b) => b ? (a / b * 100).toFixed(1).replace('.', ',') : '0';

/* ---- ciclo de correção: reagrega GD por PROBLEMA (um GDIS) --------------
   Mesma lógica da quarta visão do painel. Nenhuma consulta nova: o status
   real de cada GDIS já vem no payload. */
const FASE_LBL = {
  pen: 'Aberto / pendente', n1: 'Em correção · Nível 1', n2: 'Em correção · Nível 2',
  n3: 'Em correção · Nível 3', usr: 'Aguardando validação do usuário',
  fim: 'Corrigido', nf: 'GDIS não localizado',
};
const FASE_ORDEM = ['pen', 'n1', 'n2', 'n3', 'usr', 'fim', 'nf'];
const FASE_COR = {
  pen: '#e65100', n1: '#1565c0', n2: '#1565c0', n3: '#c62828',
  usr: '#e65100', fim: '#2e7d32', nf: '#666',
};
const DE_BALDE = { pen: 'pen', n1: 'n1', n2: 'n2', n3: 'n3', usr: 'usr', res: 'fim', can: 'fim', des: 'fim', nf: 'nf' };

const problemas = (() => {
  const m = new Map();
  for (const r of GD.rows) {
    const chave = String(r[5] || '').trim();
    if (!/^GDIS-\d+$/.test(chave)) continue;
    let e = m.get(chave);
    if (!e) {
      e = { gdis: chave, gstat: r[7] >= 0 ? GD.gsts[r[7]] : '', fase: DE_BALDE[r[6]] || 'nf',
            keys: [], qtd: 0, valor: 0, dias: 0, _t: new Map() };
      m.set(chave, e);
    }
    e.keys.push('SDPREJ-' + r[0]);
    e.qtd++; e.valor += r[3];
    if (r[4] > e.dias) e.dias = r[4];
    const t = GD.temas[r[2]];
    e._t.set(t, (e._t.get(t) || 0) + 1);
  }
  return [...m.values()].map(e => {
    e.tema = [...e._t.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))[0][0];
    delete e._t;
    return e;
  });
})();

const probTotal = problemas.length;
const probCorrigidos = problemas.filter(p => p.fase === 'fim');
const probAbertos = problemas.filter(p => p.fase !== 'fim');
const probEmCorrecao = problemas.filter(p => ['n1', 'n2', 'n3'].includes(p.fase));
const probN3 = problemas.filter(p => p.fase === 'n3');
const valorRetido = probAbertos.reduce((s, p) => s + p.valor, 0);
const valorDestravado = probCorrigidos.reduce((s, p) => s + p.valor, 0);

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

<ac:structured-macro ac:name="tip">
<ac:parameter ac:name="title">✅ PAINEL INTERATIVO DISPONÍVEL</ac:parameter>
<ac:rich-text-body>
<p><strong>Acesse o painel completo com gráficos dinâmicos, filtros interativos e análises em tempo real.</strong></p>
<p style="margin: 12px 0 0 0;">
<a href="${PAINEL_URL}" target="_blank" style="display: inline-block; background: #003366; color: white; padding: 10px 20px; border-radius: 4px; font-weight: bold; font-size: 14px; text-decoration: none;">→ ABRIR PAINEL INTERATIVO</a>
</p>
<p style="font-size: 12px; color: #666; margin: 8px 0 0 0;">Quatro visões: Temas • Vínculo com GDIS • Por analista • <strong>Ciclo de correção</strong> | Filtros • Gráficos • CSV</p>
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

<h1>🔁 VISÃO 4: CICLO DE CORREÇÃO</h1>
<p>De <strong>aberto</strong> a <strong>corrigido</strong>: em que fase está cada problema de TI que originou prejuízo, e quanto prejuízo cada fase ainda segura. A unidade aqui é o <strong>problema</strong> (um GDIS), não o chamado de prejuízo — por isso os totais desta seção não fecham com os das anteriores.</p>

<table style="width: 100%; border-spacing: 8px; border-collapse: separate;">
<tbody>
<tr>
<td style="background: #e8f5e9; border-left: 4px solid #388e3c; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 28px; font-weight: bold; color: #2e7d32;">${nfInt(probCorrigidos.length)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>Problemas corrigidos</strong></div>
<div style="font-size: 10px; color: #2e7d32; font-weight: bold;">${pcn(probCorrigidos.length, probTotal)}% de ${nfInt(probTotal)} rastreados</div>
</td>

<td style="background: #fff3e0; border-left: 4px solid #f57c00; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 28px; font-weight: bold; color: #e65100;">${nfInt(probEmCorrecao.length)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>Em correção</strong></div>
<div style="font-size: 10px; color: #666;">análise técnica em curso</div>
</td>

<td style="background: #ffebee; border-left: 4px solid #d32f2f; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 28px; font-weight: bold; color: #c62828;">${nfInt(probN3.length)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>No Nível 3</strong></div>
<div style="font-size: 10px; color: #c62828; font-weight: bold;">⚠️ GARGALO</div>
</td>

<td style="background: #ffebee; border-left: 4px solid #d32f2f; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 20px; font-weight: bold; color: #c62828;">${nfBRL(valorRetido)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>Prejuízo retido</strong></div>
<div style="font-size: 10px; color: #666;">${nfInt(probAbertos.reduce((s, p) => s + p.qtd, 0))} SDPREJ travados</div>
</td>

<td style="background: #e8f5e9; border-left: 4px solid #388e3c; padding: 12px; border-radius: 4px; text-align: center;">
<div style="font-size: 20px; font-weight: bold; color: #2e7d32;">${nfBRL(valorDestravado)}</div>
<div style="font-size: 12px; color: #333; margin-top: 4px;"><strong>Prejuízo destravado</strong></div>
<div style="font-size: 10px; color: #666;">${nfInt(probCorrigidos.reduce((s, p) => s + p.qtd, 0))} SDPREJ liberados</div>
</td>
</tr>
</tbody>
</table>

<h3>Fases do problema — de aberto a corrigido</h3>
<table>
<tbody>
<tr><th>Fase</th><th>Problemas</th><th>% do total</th><th>SDPREJ vinculados</th><th>Prejuízo R$</th></tr>
${FASE_ORDEM.map(c => {
  const g = problemas.filter(p => p.fase === c);
  if (!g.length) return '';
  return `<tr>
<td><strong style="color: ${FASE_COR[c]};">${esc(FASE_LBL[c])}</strong></td>
<td>${nfInt(g.length)}</td>
<td style="text-align: right;">${pcn(g.length, probTotal)}%</td>
<td style="text-align: right;">${nfInt(g.reduce((s, p) => s + p.qtd, 0))}</td>
<td style="text-align: right;"><strong>${nfBRL(g.reduce((s, p) => s + p.valor, 0))}</strong></td>
</tr>`;
}).join('')}
<tr style="background: #f5f5f5;">
<td><strong>TOTAL</strong></td>
<td><strong>${nfInt(probTotal)}</strong></td>
<td style="text-align: right;"><strong>100%</strong></td>
<td style="text-align: right;"><strong>${nfInt(problemas.reduce((s, p) => s + p.qtd, 0))}</strong></td>
<td style="text-align: right;"><strong>${nfBRL(problemas.reduce((s, p) => s + p.valor, 0))}</strong></td>
</tr>
</tbody>
</table>

<h3>Fila de correção — onde corrigir devolve mais valor</h3>
<p style="font-size: 12px; color: #666;">Problemas <strong>ainda não corrigidos</strong>, do que segura mais prejuízo para o que segura menos.</p>
<table>
<tbody>
<tr><th>Problema</th><th>Fase</th><th>Tema predominante</th><th>SDPREJ</th><th>Dias</th><th>Prejuízo retido R$</th></tr>
${[...probAbertos].sort((a, b) => b.valor - a.valor).slice(0, 10).map(p => `<tr>
<td><a href="https://cvccorp.atlassian.net/browse/${esc(p.gdis)}"><strong>${esc(p.gdis)}</strong></a></td>
<td style="color: ${FASE_COR[p.fase]}; font-weight: bold;">${esc(FASE_LBL[p.fase])}</td>
<td>${esc(p.tema)}</td>
<td style="text-align: right;">${nfInt(p.qtd)}</td>
<td style="text-align: right;${p.dias > 365 ? ' color: #c62828; font-weight: bold;' : ''}">${nfInt(p.dias)}d</td>
<td style="text-align: right; color: #c62828;"><strong>${nfBRL(p.valor)}</strong></td>
</tr>`).join('')}
</tbody>
</table>

<ac:structured-macro ac:name="tip">
<ac:parameter ac:name="title">Onde ver o detalhe completo</ac:parameter>
<ac:rich-text-body>
<p>Esta seção é o resumo. O detalhe navegável está em dois lugares:</p>
<ul>
<li>A página <strong>"SDPREJ — Ciclo de Correção do Problema"</strong>, filha desta, com todas as fases e a lista completa do Nível 3.</li>
<li>A aba <strong>"Ciclo de correção"</strong> do painel interativo, com filtros por fase e tema, ordenação por qualquer coluna e download em CSV.</li>
</ul>
</ac:rich-text-body>
</ac:structured-macro>

<hr/>

<p style="font-size: 11px; color: #999; text-align: center; margin-top: 32px;">
✅ Dashboard SDPREJ — Trend Operadora<br/>
📊 Quatro visões: Temas · Vínculo com GDIS · Por analista · Ciclo de correção<br/>
🔄 Painel atualizado automaticamente de segunda a sexta às 8:00<br/>
Versão 2.1
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
