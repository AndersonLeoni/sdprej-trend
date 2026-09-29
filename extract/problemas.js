#!/usr/bin/env node
/**
 * problemas.js — Extrai GDIS/SUST e seus impactos em SDPREJ
 *
 * Varre:
 * 1. Projeto GDIS e SUST (problemas identificados)
 * 2. Para cada um, busca SDPREJ vinculados
 * 3. Calcula impacto: quantidade + valor
 * 4. Agrupa por status: aberto, em correção, corrigido
 *
 * Uso: node extract/problemas.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const jira = require('./jira');

const RAIZ = path.join(__dirname, '..');

/**
 * Mapeia status GDIS/SUST para categorias
 */
const mapStatus = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('fechad') || s.includes('resolv') || s.includes('done')) return 'corrigido';
  if (s.includes('progress') || s.includes('análise') || s.includes('em ') || s.includes('correção')) return 'em_correcao';
  return 'aberto';
};

/**
 * Busca GDIS/SUST com detalhes (ultimos 90 dias, limit 100)
 */
async function buscarProblemas() {
  console.error('🔍 Buscando GDIS e SUST (últimos 90 dias)...');

  // Limita a últimos 90 dias pra ser mais eficiente
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - 90);
  const dataStr = dataLimite.toISOString().split('T')[0];

  const jql = `(project = GDIS OR project = SUST) AND created >= ${dataStr} ORDER BY created DESC`;

  try {
    const res = await jira.buscar(jql, ['summary', 'status', 'issuetype', 'priority', 'reporter', 'created', 'updated'], {
      expand: 'changelog',
      maxResults: 100
    });

    if (!res || !res.issues) {
      console.error('   ⚠️  Nenhum resultado retornado');
      return [];
    }

    console.error(`   ✅ ${res.issues.length} GDIS/SUST encontrados (últimos 90 dias)\n`);
    return res.issues;
  } catch (err) {
    console.error(`   ❌ Erro ao buscar: ${err.message}`);
    throw err;
  }
}

/**
 * Busca impactos em batch (todos SDPREJ com vínculo GDIS/SUST)
 */
async function buscarTodosImpactos() {
  const jql = `project = SDPREJ AND issuetype = "Service Request" AND (summary ~ GDIS- OR summary ~ SUST-)`;

  try {
    const res = await jira.buscar(jql, ['customfield_10973', 'customfield_11059', 'customfield_11048'], {
      maxResults: 1000
    });

    if (!res || !res.issues) return {};

    // Agrupa por chave GDIS/SUST
    const impactos = {};
    res.issues.forEach(issue => {
      const gdisField = issue.fields['customfield_10973'] || '';
      const gdisMatch = gdisField.match(/[GS]DIS-\d+/);

      if (gdisMatch) {
        const gdisKey = gdisMatch[0];
        const prejuizo = issue.fields['customfield_11059'] || issue.fields['customfield_11048'] || 0;

        if (!impactos[gdisKey]) {
          impactos[gdisKey] = { chamados: [], valor: 0 };
        }
        impactos[gdisKey].chamados.push(issue.key);
        impactos[gdisKey].valor += (prejuizo || 0);
      }
    });

    return impactos;
  } catch (e) {
    console.error('⚠️  Aviso: Erro ao buscar impactos:', e.message);
    return {};
  }
}

/**
 * Extrai data da primeira transição (criação)
 */
function extrairDatas(issue) {
  let criadoEm = issue.fields.created ? new Date(issue.fields.created) : new Date();
  let atualizadoEm = issue.fields.updated ? new Date(issue.fields.updated) : criadoEm;
  let resolvidoEm = null;

  if (issue.changelog && issue.changelog.histories) {
    issue.changelog.histories.forEach(h => {
      h.items?.forEach(item => {
        if (item.field === 'status' && item.toString && mapStatus(item.toString) === 'corrigido') {
          resolvidoEm = new Date(h.created);
        }
      });
    });
  }

  return {
    criadoEm: criadoEm.toISOString().split('T')[0],
    atualizadoEm: atualizadoEm.toISOString().split('T')[0],
    resolvidoEm: resolvidoEm ? resolvidoEm.toISOString().split('T')[0] : null
  };
}

/**
 * Função de exportação (padrão usado por extract/run.js)
 */
async function montar(cfg, agora) {
  const problemas = await buscarProblemas();

  console.error('📊 Processando impactos...\n');

  const resultado = {
    geradoEm: agora.toISOString().split('T')[0],
    total: problemas.length,
    aberto: [],
    em_correcao: [],
    corrigido: [],
    sumario: {
      totalChamadosSdprej: 0,
      totalValorImpactado: 0
    }
  };

  // Busca todos impactos uma única vez
  const todosImpactos = await buscarTodosImpactos();

  for (let i = 0; i < problemas.length; i++) {
    const issue = problemas[i];
    const statusAtual = mapStatus(issue.fields.status?.name);

    const impacto = todosImpactos[issue.key] || { chamados: [], valor: 0 };
    const datas = extrairDatas(issue);

    const registro = {
      chave: issue.key,
      tipo: issue.fields.issuetype?.name || 'Desconhecido',
      status: statusAtual,
      summary: issue.fields.summary,
      prioridade: issue.fields.priority?.name || '-',
      criador: issue.fields.reporter?.displayName || 'Desconhecido',
      criadoEm: datas.criadoEm,
      atualizadoEm: datas.atualizadoEm,
      resolvidoEm: datas.resolvidoEm,
      sdprejImpactados: impacto.chamados,
      quantidadeSdprej: impacto.chamados.length,
      valorTotalImpactado: impacto.valor,
      diasAberto: Math.floor((new Date() - new Date(datas.criadoEm)) / (1000 * 60 * 60 * 24)),
      link: `https://cvccorp.atlassian.net/browse/${issue.key}`
    };

    resultado.sumario.totalChamadosSdprej += impacto.chamados.length;
    resultado.sumario.totalValorImpactado += impacto.valor;

    if (statusAtual === 'corrigido') resultado.corrigido.push(registro);
    else if (statusAtual === 'em_correcao') resultado.em_correcao.push(registro);
    else resultado.aberto.push(registro);

    if ((i + 1) % 10 === 0) console.error(`   ${i + 1}/${problemas.length}`);
  }

  resultado.aberto.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  resultado.em_correcao.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  resultado.corrigido.sort((a, b) => new Date(b.resolvidoEm) - new Date(a.resolvidoEm));

  console.error('\n✅ problemas.json gerado!\n');
  console.error(`📊 Resumo:`);
  console.error(`   Abertos: ${resultado.aberto.length}`);
  console.error(`   Em Correção: ${resultado.em_correcao.length}`);
  console.error(`   Corrigidos: ${resultado.corrigido.length}`);
  console.error(`   SDPREJ Impactados: ${resultado.sumario.totalChamadosSdprej}`);
  console.error(`   Valor Total Impactado: R$ ${resultado.sumario.totalValorImpactado.toLocaleString('pt-BR')}\n`);

  return resultado;
}

module.exports = { montar };
