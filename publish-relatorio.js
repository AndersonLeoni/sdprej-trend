#!/usr/bin/env node
/**
 * publish-relatorio.js — publica o relatorio do ciclo de correcao no Confluence
 *
 * Cria (ou atualiza) a pagina "SDPREJ — Ciclo de Correcao do Problema" como
 * filha da pagina index. Le o conteudo de relatorio-problemas.html.
 *
 * Uso: node publish-relatorio.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const PAGE_TITLE = 'SDPREJ — Ciclo de Correção do Problema';

let config;
try {
  let raw = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  config = JSON.parse(raw);
} catch (e) {
  console.error('❌ config.json não encontrado ou inválido:', e.message);
  process.exit(1);
}

const BASE_URL = config.jira.baseUrl + '/wiki';
const EMAIL = process.env.JIRA_EMAIL || config.jira.email;
const TOKEN = process.env.JIRA_TOKEN || config.jira.token;
const SPACE = config.confluence.spaceKey;
const PARENT = config.confluence.pageId;

if (!EMAIL || !TOKEN) {
  console.error('❌ Credenciais ausentes (JIRA_EMAIL / JIRA_TOKEN ou config.json).');
  process.exit(1);
}

const auth = Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');

function req(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opt = {
      hostname: u.hostname, port: 443, path: u.pathname + u.search, method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SDPREJ-Publisher/1.0',
      },
    };
    if (body) opt.headers['Content-Length'] = Buffer.byteLength(body);

    const r = https.request(opt, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch (e) { parsed = { raw: data.slice(0, 300) }; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

(async () => {
  console.log('🔁 Publicando relatório do ciclo de correção...\n');

  const arq = path.join(__dirname, 'relatorio-problemas.html');
  if (!fs.existsSync(arq)) {
    console.error('❌ relatorio-problemas.html não encontrado.');
    console.error('   Execute antes: node generate-relatorio-problemas.js');
    process.exit(1);
  }
  const conteudo = fs.readFileSync(arq, 'utf8');

  try {
    const busca = await req('GET',
      `${BASE_URL}/rest/api/content?spaceKey=${SPACE}&title=${encodeURIComponent(PAGE_TITLE)}`);

    if (busca.status !== 200) {
      console.error(`❌ Erro ${busca.status} ao procurar a página`);
      console.error(JSON.stringify(busca.body, null, 2));
      process.exit(1);
    }

    const achou = busca.body.results && busca.body.results.length > 0;

    if (achou) {
      const id = busca.body.results[0].id;

      /* A versao tem de vir de um GET pelo ID: o resultado da busca por titulo
         nem sempre traz a versao corrente, e o Confluence recusa o PUT com 409
         quando o numero enviado nao e exatamente o atual + 1. */
      const det = await req('GET', `${BASE_URL}/rest/api/content/${id}?expand=version`);
      if (det.status !== 200) {
        console.error(`❌ Erro ${det.status} ao ler a versão atual`);
        process.exit(1);
      }
      const versao = det.body.version && det.body.version.number ? det.body.version.number : 1;

      console.log(`📄 Página encontrada (ID: ${id}). Versão ${versao} → ${versao + 1}...\n`);

      const upd = await req('PUT', `${BASE_URL}/rest/api/content/${id}`, JSON.stringify({
        version: { number: versao + 1 },
        title: PAGE_TITLE,
        type: 'page',
        body: { storage: { value: conteudo, representation: 'storage' } },
      }));

      if (upd.status === 200) {
        console.log('✅ Relatório atualizado com sucesso!\n');
        console.log(`🔗 ${BASE_URL}/spaces/${SPACE}/pages/${id}\n`);
      } else {
        console.error(`❌ Erro ${upd.status}`);
        console.error(JSON.stringify(upd.body, null, 2));
        process.exit(1);
      }
    } else {
      console.log('Criando página do relatório...\n');

      const cri = await req('POST', `${BASE_URL}/rest/api/content`, JSON.stringify({
        type: 'page',
        title: PAGE_TITLE,
        space: { key: SPACE },
        ancestors: [{ id: PARENT }],
        body: { storage: { value: conteudo, representation: 'storage' } },
      }));

      if (cri.status === 200) {
        console.log('✅ Relatório criado com sucesso!\n');
        console.log(`🔗 ${BASE_URL}/spaces/${SPACE}/pages/${cri.body.id}\n`);
      } else {
        console.error(`❌ Erro ${cri.status}`);
        console.error(JSON.stringify(cri.body, null, 2));
        process.exit(1);
      }
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
})();
