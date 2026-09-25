#!/usr/bin/env node
/**
 * start-painel-with-ngrok.js — Inicia ngrok + servidor Node + atualiza Confluence
 *
 * Uso: node start-painel-with-ngrok.js
 *
 * Faz:
 * 1. Inicia ngrok na porta 8000
 * 2. Obtém a URL pública
 * 3. Atualiza o link no Confluence
 * 4. Mantém tudo rodando
 */

const { spawn } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

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

let ngrokUrl = null;
let serverProcess = null;
let ngrokProcess = null;

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

async function updateConfluenceLink(ngrokUrl) {
  console.log(`\n🔗 Atualizando link no Confluence com: ${ngrokUrl}\n`);

  const pageTitle = 'PAINEL SDPREJ — Gráficos Interativos';
  const pageContent = `<p><strong>🖥️ PAINEL SDPREJ — Gráficos Interativos em Tempo Real</strong></p>
<p style="font-size: 13px; color: #666;">Trend Operadora — Três visões: Temas • Analistas • GDIS</p>

<ac:structured-macro ac:name="info">
<ac:rich-text-body>
<p>Painel completo com gráficos dinâmicos, filtros interativos e dados atualizados automaticamente do Jira.</p>
</ac:rich-text-body>
</ac:structured-macro>

<p style="text-align: center; margin: 24px 0;">
<a href="${ngrokUrl}/SDPREJ_Painel.html" target="_blank" style="display: inline-block; background: #003366; color: white; padding: 12px 24px; border-radius: 4px; font-weight: bold; font-size: 16px; text-decoration: none;">→ ABRIR PAINEL COMPLETO</a>
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
    // Procura a página
    const searchRes = await httpsRequest(
      'GET',
      `${BASE_URL}/rest/api/content?spaceKey=${config.confluence.spaceKey}&title=${encodeURIComponent(pageTitle)}`
    );

    if (searchRes.status === 200 && searchRes.body.results && searchRes.body.results.length > 0) {
      const page = searchRes.body.results[0];
      const version = (page.version && page.version.number) ? page.version.number : 1;

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
        console.log('✅ Link do Confluence atualizado com sucesso!');
        console.log(`🔗 ${ngrokUrl}\n`);
      }
    }
  } catch (err) {
    console.error('⚠️  Erro ao atualizar Confluence:', err.message);
  }
}

async function startServers() {
  console.log('🚀 Iniciando SDPREJ com ngrok...\n');

  // Inicia servidor Node na porta 8000
  console.log('📡 Iniciando servidor Node...');
  serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  // Aguarda um pouco pra servidor iniciar
  await new Promise(r => setTimeout(r, 2000));

  // Inicia ngrok
  console.log('🌐 Iniciando ngrok...\n');
  ngrokProcess = spawn('ngrok', ['http', '8000'], {
    stdio: 'pipe'
  });

  let ngrokOutput = '';
  ngrokProcess.stdout.on('data', (data) => {
    ngrokOutput += data.toString();

    // Procura pela URL no output do ngrok
    const match = ngrokOutput.match(/https:\/\/[a-z0-9]+\.ngrok\.io/);
    if (match && !ngrokUrl) {
      ngrokUrl = match[0];
      console.log(`✅ ngrok iniciado`);
      console.log(`🌐 URL pública: ${ngrokUrl}\n`);

      // Atualiza o Confluence
      updateConfluenceLink(ngrokUrl);
    }
  });

  ngrokProcess.stderr.on('data', (data) => {
    console.log(`⚠️  ${data.toString()}`);
  });
}

function handleExit() {
  console.log('\n\n🛑 Parando serviços...');
  if (serverProcess) serverProcess.kill();
  if (ngrokProcess) ngrokProcess.kill();
  console.log('✅ Tudo encerrado');
  process.exit(0);
}

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

startServers().catch(err => {
  console.error('❌ Erro ao iniciar:', err.message);
  process.exit(1);
});

console.log('\n💡 Dica: O link do Confluence é atualizado automaticamente a cada reinício\n');
console.log('Pressione CTRL+C para parar\n');
