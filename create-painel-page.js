#!/usr/bin/env node
/**
 * create-painel-page.js — Cria uma página dedicada no Confluence para o painel
 *
 * Uso: node create-painel-page.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// URL do GitHub Pages — acessível publicamente
const PAINEL_URL = 'https://AndersonLeoni.github.io/sdprej-trend/';
const GITHUB_USER = 'AndersonLeoni';

// Lê configuração do arquivo
const configPath = path.join(__dirname, 'config.json');
let config;

console.log(`📂 Procurando config em: ${configPath}`);

try {
  if (!fs.existsSync(configPath)) {
    console.error('❌ config.json não encontrado em:', configPath);
    process.exit(1);
  }

  let rawData = fs.readFileSync(configPath, 'utf8');
  console.log(`📄 Arquivo encontrado (${rawData.length} bytes)`);

  // Remove BOM se existir
  if (rawData.charCodeAt(0) === 0xFEFF) {
    rawData = rawData.slice(1);
  }

  config = JSON.parse(rawData);
  console.log('✅ Config carregado com sucesso');
} catch (e) {
  console.error('❌ Erro ao ler config.json:', e.message);
  process.exit(1);
}

const BASE_URL = config.jira.baseUrl + '/wiki';
const PARENT_PAGE_ID = config.confluence.pageId;
const EMAIL = config.jira.email;
const TOKEN = config.jira.token;

const auth = Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');

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
  console.log('📄 Verificando página do painel no Confluence...\n');

  const pageTitle = 'PAINEL SDPREJ — Gráficos Interativos';
  const pageContent = `<p><strong>🖥️ PAINEL SDPREJ — Gráficos Interativos em Tempo Real</strong></p>
<p style="font-size: 13px; color: #666;">Trend Operadora — Três visões: Temas • Analistas • GDIS</p>

<ac:structured-macro ac:name="info">
<ac:rich-text-body>
<p>Painel completo com gráficos dinâmicos, filtros interativos e dados atualizados automaticamente do Jira.</p>
</ac:rich-text-body>
</ac:structured-macro>

<p style="text-align: center; margin: 24px 0;">
<a href="${PAINEL_URL}" target="_blank" style="display: inline-block; background: #003366; color: white; padding: 12px 24px; border-radius: 4px; font-weight: bold; font-size: 16px; text-decoration: none;">→ ABRIR PAINEL COMPLETO</a>
</p>

<h2>📊 Visões Disponíveis</h2>
<ul>
<li><strong>Temas:</strong> Classificação por padrão derivado, área, fornecedor, aging e valor mensal</li>
<li><strong>Analistas:</strong> Timeline de ciclos, ritmo de análise, fila de espera por faixa de dias</li>
<li><strong>GDIS:</strong> Rastreamento de incidentes, vínculo com chamados, escalação e status</li>
</ul>

<h2>🔄 Atualização Automática</h2>
<p>Os dados são atualizados automaticamente todos os dias com as informações mais recentes do Jira.</p>`;

  try {
    // Procura se a página já existe
    const searchRes = await httpsRequest(
      'GET',
      `${BASE_URL}/rest/api/content?spaceKey=${config.confluence.spaceKey}&title=${encodeURIComponent(pageTitle)}`
    );

    let pageId;

    if (searchRes.status === 200 && searchRes.body.results && searchRes.body.results.length > 0) {
      // Página existe — atualiza
      const page = searchRes.body.results[0];
      pageId = page.id;
      const version = (page.version && page.version.number) ? page.version.number : 1;

      console.log(`📄 Página encontrada (ID: ${pageId}). Atualizando...\n`);

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
        `${BASE_URL}/rest/api/content/${pageId}`,
        JSON.stringify(updateBody)
      );

      if (updateRes.status === 200) {
        console.log('✅ Página atualizada com sucesso!\n');
        console.log(`📍 ID: ${pageId}`);
        console.log(`🔗 URL: ${BASE_URL}/spaces/${config.confluence.spaceKey}/pages/${pageId}\n`);
      }
    } else {
      // Página não existe — cria
      console.log('Criando nova página...\n');

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
        pageId = createRes.body.id;
        console.log('✅ Página criada com sucesso!\n');
        console.log(`📍 ID: ${pageId}`);
        console.log(`🔗 URL: ${BASE_URL}/spaces/${config.confluence.spaceKey}/pages/${pageId}\n`);
      } else {
        console.error(`❌ Erro ${createRes.status}`);
        console.log(JSON.stringify(createRes.body, null, 2));
      }
    }

    console.log('✅ Link atualizado para GitHub Pages!');

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
})();
