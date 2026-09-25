#!/usr/bin/env node
/**
 * publish-documentation.js — Publica documentação no Confluence
 *
 * Uso: node publish-documentation.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Lê config
let config;
try {
  let rawData = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');
  if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
  config = JSON.parse(rawData);
} catch (e) {
  console.error('❌ config.json não encontrado');
  process.exit(1);
}

const BASE_URL = config.jira.baseUrl + '/wiki';
const EMAIL = config.jira.email;
const TOKEN = config.jira.token;
const auth = Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');
const PARENT_PAGE_ID = config.confluence.pageId;

function httpsRequest(method, url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'SDPREJ-Publisher/1.0',
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: { raw: data.slice(0, 200) } });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  console.log('📄 Publicando documentação no Confluence...\n');

  try {
    // Lê conteúdo gerado
    const contentPath = path.join(__dirname, 'documentation-content.html');
    if (!fs.existsSync(contentPath)) {
      console.error('❌ documentation-content.html não encontrado');
      console.error('   Execute: node generate-documentation-page.js');
      process.exit(1);
    }

    const pageContent = fs.readFileSync(contentPath, 'utf8');
    const pageTitle = 'SDPREJ — Documentação e Arquitetura';

    // Procura se página existe
    const searchRes = await httpsRequest(
      'GET',
      `${BASE_URL}/rest/api/content?spaceKey=${config.confluence.spaceKey}&title=${encodeURIComponent(pageTitle)}`
    );

    if (searchRes.status === 200 && searchRes.body.results && searchRes.body.results.length > 0) {
      // Página existe — atualiza
      const page = searchRes.body.results[0];
      const version = (page.version && page.version.number) ? page.version.number : 1;

      console.log(`📄 Página encontrada (ID: ${page.id}). Atualizando...\n`);

      const updateBody = {
        version: { number: version + 1 },
        title: pageTitle,
        type: 'page',
        body: {
          storage: {
            value: pageContent,
            representation: 'storage'
          }
        }
      };

      const updateRes = await httpsRequest(
        'PUT',
        `${BASE_URL}/rest/api/content/${page.id}`,
        JSON.stringify(updateBody)
      );

      if (updateRes.status === 200) {
        console.log('✅ Documentação atualizada com sucesso!\n');
        console.log(`🔗 ${BASE_URL}/spaces/${config.confluence.spaceKey}/pages/${page.id}\n`);
      } else {
        console.error(`❌ Erro ${updateRes.status}`);
        console.log(JSON.stringify(updateRes.body, null, 2));
      }
    } else {
      // Página não existe — cria
      console.log('Criando página de documentação...\n');

      const pageBody = {
        type: 'page',
        title: pageTitle,
        space: { key: config.confluence.spaceKey },
        ancestors: [{ id: PARENT_PAGE_ID }],
        body: {
          storage: {
            value: pageContent,
            representation: 'storage'
          }
        }
      };

      const createRes = await httpsRequest(
        'POST',
        `${BASE_URL}/rest/api/content`,
        JSON.stringify(pageBody)
      );

      if (createRes.status === 200) {
        console.log('✅ Documentação criada com sucesso!\n');
        console.log(`🔗 ${BASE_URL}/spaces/${config.confluence.spaceKey}/pages/${createRes.body.id}\n`);
      } else {
        console.error(`❌ Erro ${createRes.status}`);
        console.log(JSON.stringify(createRes.body, null, 2));
      }
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
})();
