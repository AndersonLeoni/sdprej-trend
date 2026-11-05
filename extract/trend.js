#!/usr/bin/env node
/**
 * trend.js — extrai o payload do painel APOIO Trend para data/trend.json.
 *
 *   node extract/trend.js
 *
 * Universo: mesma base dos filtros do time (11295 Analise, 11304 Alteracao,
 * 11303 Relatorios) SEM o corte de status e de responsavel — aqueles filtros
 * sao filas ("sem responsavel"), e aqui o interesse e o historico.
 *
 * Entram os chamados criados OU resolvidos nos ultimos 6 meses: a vazao
 * (resolvidos) precisa contar tambem o que nasceu antes da janela.
 *
 * Payload colunar: cada linha e um chamado.
 *   k chave | c criado (YYYY-MM-DD) | r resolvido ('' se aberto) | t tipo (idx)
 *   s status (idx) | a responsavel (idx, -1 = sem) | d 1 = encerrado
 *   f 1a resposta: 1 no prazo, 0 estourou, -1 sem SLA
 *   q resolucao:   1 no prazo, 0 estourou, -1 sem SLA
 */
'use strict';

const fs = require('fs');
const path = require('path');
const jira = require('./jira');

const RAIZ = path.join(__dirname, '..');
const FILTROS = [11295, 11304, 11303];
const BASE_JQL =
  'project IN ("Atendimento T.I.",Sistemas) AND component = "APOIO Trend" AND ' +
  '"Request Type" in ("Análise - Trend (GDIS)","Alteração Trend (GDIS)","Relatórios Trend (GDIS)")';
const SLA_RESOLUCAO = 'customfield_10618';   // Time to resolution
const SLA_RESPOSTA  = 'customfield_10909';   // Tempo até a primeira resposta
const REQUEST_TYPE  = 'customfield_10010';

const z = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
const carimbo = d => `${iso(d)} ${z(d.getHours())}:${z(d.getMinutes())}`;
const mesesAtras = (d, n) => {
  const r = new Date(d.getFullYear(), d.getMonth() - n, 1);
  const ultimo = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(d.getDate(), ultimo));
  return r;
};

/** 1 = no prazo, 0 = estourou, -1 = campo vazio. Usa o ultimo ciclo (o vigente). */
function sla(campo) {
  if (!campo) return -1;
  const ciclos = [...(campo.completedCycles || []), campo.ongoingCycle].filter(Boolean);
  if (!ciclos.length) return -1;
  return ciclos[ciclos.length - 1].breached ? 0 : 1;
}

const tipoCurto = n => (n || '(sem tipo)').replace(/\s*-?\s*Trend(\s*\(GDIS\))?\s*$/i, '').trim();

async function montar() {
  const agora = new Date();
  const hoje = iso(agora);
  const janelas = { m6: iso(mesesAtras(agora, 6)), m4: iso(mesesAtras(agora, 4)), m2: iso(mesesAtras(agora, 2)) };

  const jql = `${BASE_JQL} AND (created >= "${janelas.m6}" OR resolved >= "${janelas.m6}") ORDER BY created ASC`;
  console.error('Universo: ' + jql);

  const issues = await jira.buscar(jql,
    ['created', 'resolutiondate', 'status', 'assignee', REQUEST_TYPE, SLA_RESOLUCAO, SLA_RESPOSTA],
    { rotulo: 'trend' });

  const dic = { tipos: [], status: [], resp: [] };
  const idx = (lista, v) => { let i = lista.indexOf(v); if (i < 0) { i = lista.length; lista.push(v); } return i; };

  const rows = issues.map(i => {
    const f = i.fields;
    return {
      k: i.key,
      c: (f.created || '').slice(0, 10),
      r: (f.resolutiondate || '').slice(0, 10),
      t: idx(dic.tipos, tipoCurto(f[REQUEST_TYPE]?.requestType?.name)),
      s: idx(dic.status, f.status?.name || '(sem status)'),
      a: f.assignee ? idx(dic.resp, f.assignee.displayName) : -1,
      d: f.status?.statusCategory?.key === 'done' ? 1 : 0,
      f: sla(f[SLA_RESPOSTA]),
      q: sla(f[SLA_RESOLUCAO]),
    };
  });

  const filtros = [];
  for (const id of FILTROS) {
    try { const m = await jira.filtro(id); filtros.push({ id, nome: m.name, jql: m.jql }); }
    catch (e) { filtros.push({ id, nome: '(indisponivel)', jql: '' }); }
  }

  return { geradoEm: carimbo(agora), hoje, janelas, jql, filtros, ...dic, rows };
}

if (require.main === module) {
  montar().then(p => {
    const txt = JSON.stringify(p);
    JSON.parse(txt);
    fs.mkdirSync(path.join(RAIZ, 'data'), { recursive: true });
    const destino = path.join(RAIZ, 'data', 'trend.json');
    fs.writeFileSync(destino + '.parcial', txt, 'utf8');
    fs.renameSync(destino + '.parcial', destino);
    console.error(`gravado data/trend.json  ${(Buffer.byteLength(txt) / 1024).toFixed(0)} KB  ${p.rows.length} chamados`);
  }).catch(e => { console.error('\nFALHOU: ' + e.message); process.exit(1); });
}

module.exports = { montar };
