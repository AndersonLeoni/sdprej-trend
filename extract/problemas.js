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
 * Busca GDIS/SUST com detalhes
 */
async function buscarProblemas() {
  console.error('🔍 Buscando GDIS e SUST...');

  const jql = `(project = GDIS OR project = SUST) ORDER BY created DESC`;
  let todos = [];
  let startAt = 0;

  while (true) {
    console.error(`   Página ${Math.floor(startAt / 50) + 1}...`);
    const res = await jira.search(jql, {
      startAt,
      maxResults: 50,
      expand: 'changelog'
    });

    if (!res || !res.issues || res.issues.length === 0) break;
    todos = todos.concat(res.issues);

    if (res.issues.length < 50) break;
    startAt += 50;
  }

  console.error(`   ✅ ${todos.length} GDIS/SUST encontrados\n`);
  return todos;
}

/**
 * Para cada GDIS/SUST, busca SDPREJ vinculados
 */
async function buscarImpacto(gdisKey) {
  const jql = `project = SDPREJ AND issuelinks = "${gdisKey}"`;
  try {
    const res = await jira.search(jql, {
      maxResults: 500,
      fields: ['customfield_11059', 'customfield_11048'] // Prejuízo Reversão e Inicial
    });

    if (!res || !res.issues) return { chamados: [], valor: 0 };

    let valor = 0;
    res.issues.forEach(issue => {
      const prejuizo = issue.fields['customfield_11059'] || issue.fields['customfield_11048'] || 0;
      valor += (prejuizo || 0);
    });

    return {
      chamados: res.issues.map(i => i.key),
      valor: Math.round(valor)
    };
  } catch (e) {
    return { chamados: [], valor: 0 };
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
 * Processa tudo
 */
async function main() {
  try {
    const problemas = await buscarProblemas();

    console.error('📊 Processando impactos...\n');

    const resultado = {
      geradoEm: new Date().toISOString().split('T')[0],
      total: problemas.length,
      aberto: [],
      em_correcao: [],
      corrigido: [],
      sumario: {
        totalChamadosSdprej: 0,
        totalValorImpactado: 0
      }
    };

    for (let i = 0; i < problemas.length; i++) {
      const issue = problemas[i];
      const statusAtual = mapStatus(issue.fields.status?.name);

      // Busca impacto
      const impacto = await buscarImpacto(issue.key);
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

    // Ordena por data
    resultado.aberto.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    resultado.em_correcao.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    resultado.corrigido.sort((a, b) => new Date(b.resolvidoEm) - new Date(a.resolvidoEm));

    // Salva
    const saida = path.join(RAIZ, 'data', 'problemas.json');
    fs.mkdirSync(path.dirname(saida), { recursive: true });
    fs.writeFileSync(saida, JSON.stringify(resultado), 'utf8');

    console.error('\n✅ problemas.json gerado!\n');
    console.error(`📊 Resumo:`);
    console.error(`   Abertos: ${resultado.aberto.length}`);
    console.error(`   Em Correção: ${resultado.em_correcao.length}`);
    console.error(`   Corrigidos: ${resultado.corrigido.length}`);
    console.error(`   SDPREJ Impactados: ${resultado.sumario.totalChamadosSdprej}`);
    console.error(`   Valor Total Impactado: R$ ${resultado.sumario.totalValorImpactado.toLocaleString('pt-BR')}\n`);

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

main();
