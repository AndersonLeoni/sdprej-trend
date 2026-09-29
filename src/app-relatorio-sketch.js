/**
 * ESBOÇO: Lógica para Visão 4 — Relatório de Problemas (GDIS/SUST)
 *
 * ⚠️ TRABALHO EM PROGRESSO — Pós-férias (segunda)
 *
 * Estrutura:
 * 1. Renderizar KPIs de status (aberto, em_correcao, corrigido, total)
 * 2. Popular tabelas por status
 * 3. Implementar filtros (status, prioridade)
 * 4. Adicionar ordenação nas colunas
 *
 * Dados disponíveis: const PR = {...}  (carregado do build.js)
 */

// ============================================================================
// PASSO 1: Renderizar KPIs de Status
// ============================================================================

function renderRelatorioKPIs() {
  if (!PR || !PR.sumario) return;

  const abertos = PR.aberto || [];
  const emCorrecao = PR.em_correcao || [];
  const corrigidos = PR.corrigido || [];

  // Calcular somas
  const somaAbertos = abertos.reduce((s, p) => s + (p.valorTotalImpactado || 0), 0);
  const somaEmCorrecao = emCorrecao.reduce((s, p) => s + (p.valorTotalImpactado || 0), 0);
  const somaCorrigidos = corrigidos.reduce((s, p) => s + (p.valorTotalImpactado || 0), 0);

  // Atualizar DOM
  document.getElementById('rel-abertos-count').textContent = nfInt(abertos.length);
  document.getElementById('rel-abertos-valor').textContent = nfBRL(somaAbertos);

  document.getElementById('rel-emcor-count').textContent = nfInt(emCorrecao.length);
  document.getElementById('rel-emcor-valor').textContent = nfBRL(somaEmCorrecao);

  document.getElementById('rel-corrigido-count').textContent = nfInt(corrigidos.length);
  document.getElementById('rel-corrigido-valor').textContent = nfBRL(somaCorrigidos);

  document.getElementById('rel-total-sdprej').textContent = nfInt(PR.sumario.totalChamadosSdprej || 0);
  document.getElementById('rel-total-valor').textContent = nfBRL(PR.sumario.totalValorImpactado || 0);
}

// ============================================================================
// PASSO 2: Popular Tabelas por Status
// ============================================================================

function renderRelatorioTabelas() {
  if (!PR) return;

  // Tabela: Abertos
  renderRelatorioTabela('rel-table-abertos', 'rel-note-abertos', PR.aberto || []);

  // Tabela: Em Correção
  renderRelatorioTabela('rel-table-emcor', 'rel-note-emcor', PR.em_correcao || []);

  // Tabela: Corrigidos
  renderRelatorioTabela('rel-table-corrigido', 'rel-note-corrigido', PR.corrigido || []);
}

function renderRelatorioTabela(tableId, noteId, problemas) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  const noteEl = document.getElementById(noteId);

  if (!problemas || problemas.length === 0) {
    tbody.innerHTML = '';
    if (noteEl) noteEl.style.display = 'block';
    return;
  }

  if (noteEl) noteEl.style.display = 'none';

  tbody.innerHTML = problemas.slice(0, 50).map(p => `
    <tr>
      <td><a href="${esc(p.link)}" target="_blank" style="color:var(--series-1)"><b>${esc(p.chave)}</b></a></td>
      <td>${esc(p.tipo || '-')}</td>
      <td style="text-align:right">${esc(p.prioridade || '-')}</td>
      <td style="text-align:right">${nfInt(p.quantidadeSdprej || 0)}</td>
      <td style="text-align:right; color:#d03b3b; font-weight:bold;">${nfBRL(p.valorTotalImpactado || 0)}</td>
      <td style="text-align:right">${p.diasAberto || 0}d</td>
    </tr>
  `).join('');

  if (problemas.length > 50) {
    tbody.innerHTML += `<tr style="text-align:center;color:var(--muted)">
      <td colspan="6">... e mais ${problemas.length - 50} registros</td>
    </tr>`;
  }
}

// ============================================================================
// PASSO 3: Implementar Filtros (Status, Prioridade)
// ============================================================================

// ⚠️ TODO: Implementar lógica de filtros
// - Adicionar event listeners aos selects: #fRelStatus, #fRelPrio
// - Filtrar dados de PR dinamicamente
// - Atualizar tabelas conforme filtros aplicados
// - Botão #rel-clear para limpar filtros

// ============================================================================
// PASSO 4: Implementar Ordenação nas Colunas
// ============================================================================

// ⚠️ TODO: Reutilizar lógica de ordenação do GDIS (existe em app.js)
// - Cliques nos headers <th data-s="..."> devem ordenar
// - Indicador de seta ↕ deve girar conforme direção
// - Ordenação case-insensitive para strings
// - Ordenação numérica para números

// ============================================================================
// PASSO 5: Inicializar Visão 4
// ============================================================================

function initRelatorio() {
  console.log('Inicializando Visão 4 — Relatório de Problemas...');

  renderRelatorioKPIs();
  renderRelatorioTabelas();

  // ⚠️ TODO: Adicionar listeners de filtro e ordenação
}

// Chamar ao carregar a página (depois que PR estiver carregado)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRelatorio);
} else {
  initRelatorio();
}
