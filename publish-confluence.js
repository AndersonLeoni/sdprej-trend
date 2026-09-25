#!/usr/bin/env node
/**
 * publish-confluence.js — publica o painel SDPREJ no Confluence
 *
 * Uso: node publish-confluence.js
 *
 * Credenciais (mesmas do Jira):
 *   JIRA_EMAIL — email da conta
 *   JIRA_TOKEN — token de API
 *
 * Atualiza a página https://cvccorp.atlassian.net/wiki/spaces/PNCT/pages/12787154969/
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuração
const PAGE_ID = '12787154969';
const SPACE_KEY = 'PNCT';
const BASE_URL = 'https://cvccorp.atlassian.net/wiki';
const API_URL = `${BASE_URL}/rest/api/content/${PAGE_ID}`;

// Lê credenciais do config.json ou variáveis de ambiente
let EMAIL = process.env.JIRA_EMAIL;
let TOKEN = process.env.JIRA_TOKEN;

if (!EMAIL || !TOKEN) {
  try {
    let rawData = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');
    // Remove BOM se existir
    if (rawData.charCodeAt(0) === 0xFEFF) {
      rawData = rawData.slice(1);
    }
    const config = JSON.parse(rawData);
    EMAIL = EMAIL || config.jira.email;
    TOKEN = TOKEN || config.jira.token;
  } catch (e) {
    // config.json não existe ou JSON inválido, continua com env vars
  }
}

if (!EMAIL || !TOKEN) {
  console.error('❌ Credenciais ausentes. Tente um dos:');
  console.error('\n   Opção 1 (recomendado): Abra novo terminal e rode:');
  console.error('   setx JIRA_EMAIL "andersonleoni@cvccorp.com.br"');
  console.error('   setx JIRA_TOKEN "seu-token-aqui"');
  console.error('\n   Opção 2: Edite config.json e adicione email e token');
  process.exit(1);
}

console.log('📤 Publicando painel no Confluence...\n');

// Lê o conteúdo gerado para Confluence (tabelas HTML puras)
const content_path = path.join(__dirname, 'confluence-content.html');
if (!fs.existsSync(content_path)) {
  console.error(`❌ Conteúdo não encontrado: ${content_path}`);
  console.error('   Execute primeiro: node generate-confluence-content.js');
  process.exit(1);
}

let content_html = fs.readFileSync(content_path, 'utf8');
const content_size = (content_html.length / 1024).toFixed(1);

console.log(`✓ Conteúdo lido: ${content_size} KB`);

// Extrair conteúdo do <body> (já é HTML puro, sem JS)
const bodyMatch = content_html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
let painel_html = bodyMatch ? bodyMatch[1] : content_html;
console.log(`✓ Pronto para publicar no Confluence\n`);

// Base64 para Basic Auth
const auth = Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');

// Função para fazer requisição HTTPS
function httpsRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SDPREJ-Publisher/1.0'
      }
    };

    if (body) {
      const json = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(json);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          if (res.statusCode >= 400) {
            reject(new Error(`${res.statusCode}: ${parsed?.message || data}`));
          } else {
            resolve({ status: res.statusCode, body: parsed });
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Passo 1: Ler versão atual da página
(async () => {
  try {
    console.log('1️⃣  Consultando versão atual da página...');
    const current = await httpsRequest('GET', `${API_URL}?expand=version,body.storage`);
    const version = current.body.version.number;
    const title = current.body.title;

    console.log(`   ✓ Versão atual: ${version}`);
    console.log(`   ✓ Título: "${title}"\n`);

    // Passo 2: Preparar conteúdo para Confluence
    console.log('2️⃣  Preparando conteúdo...');

    // Embutir o painel direto sem macro (Confluence pode não ter macro HTML habilitada)
    // O painel é autocontido com <!DOCTYPE>, então funciona como iframe virtual
    const confluenceBody = {
      version: {
        number: version + 1
      },
      title: title,
      type: 'page',
      body: {
        storage: {
          value: `<p><strong>Painel SDPREJ</strong> — atualizado em ${new Date().toLocaleString('pt-BR')}</p>${painel_html}`,
          representation: 'storage'
        }
      }
    };

    console.log(`   ✓ Versão para publicar: ${version + 1}\n`);

    // Passo 3: Atualizar página
    console.log('3️⃣  Enviando para Confluence...');
    const updated = await httpsRequest('PUT', API_URL, confluenceBody);

    console.log(`   ✓ Status: ${updated.status}`);
    console.log(`   ✓ Versão: ${updated.body.version.number}`);
    console.log(`   ✓ Última atualização: ${updated.body.version.when}\n`);

    // Passo 4: Confirmação
    console.log('✅ Painel publicado com sucesso!\n');
    console.log(`📍 Acesso: ${BASE_URL}/spaces/${SPACE_KEY}/pages/${PAGE_ID}\n`);
    console.log(`⏱️  Próxima atualização: node publish-confluence.js\n`);

  } catch (err) {
    console.error('\n❌ Erro ao publicar:\n');
    console.error(`   ${err.message}\n`);

    if (err.message.includes('401') || err.message.includes('403')) {
      console.error('   Verifique as credenciais:');
      console.error('   - Email correto?');
      console.error('   - Token válido? (gere novo em https://id.atlassian.com/manage-profile/security/api-tokens)');
    }

    process.exit(1);
  }
})();
