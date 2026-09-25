#!/usr/bin/env node
/**
 * upload-screenshots.js — upload de screenshots como attachments do Confluence
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PAGE_ID = '12787154969';
const BASE_URL = 'https://cvccorp.atlassian.net/wiki';
const UPLOAD_URL = `${BASE_URL}/rest/api/content/${PAGE_ID}/child/attachment`;

const EMAIL = process.env.JIRA_EMAIL;
const TOKEN = process.env.JIRA_TOKEN;

if (!EMAIL || !TOKEN) {
  console.error('❌ Credenciais ausentes:');
  console.error('   export JIRA_EMAIL="seu.email@cvccorp.com.br"');
  console.error('   export JIRA_TOKEN="seu-token"');
  process.exit(1);
}

const auth = Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');

const screenshots = [
  { dir: 'temas', file: 'temas-kpis.png', title: 'KPIs - Resumo Temas' },
  { dir: 'temas', file: 'temas-tema.png', title: 'Tema - Padrão Derivado' },
  { dir: 'temas', file: 'temas-area.png', title: 'Área Identificadora' },
  { dir: 'temas', file: 'temas-fornecedor.png', title: 'Fornecedores / Hotéis' },
  { dir: 'temas', file: 'temas-aging.png', title: 'Aging - Dias Aberto' },
  { dir: 'temas', file: 'temas-mensal.png', title: 'Mensal - Valor' },
  { dir: 'analistas', file: 'analistas-kpis.png', title: 'KPIs - Resumo Analistas' },
  { dir: 'analistas', file: 'analistas-timeline.png', title: 'Timeline - Ciclos por Mês' },
  { dir: 'analistas', file: 'analistas-ritmo.png', title: 'Ritmo - Ciclos por Analista' },
  { dir: 'analistas', file: 'analistas-fila.png', title: 'Fila - Faixa de Dias' },
  { dir: 'gdis', file: 'gdis-kpis.png', title: 'KPIs - Resumo GDIS' },
  { dir: 'gdis', file: 'gdis-situacao.png', title: 'Situação do GDIS' },
  { dir: 'gdis', file: 'gdis-etapa.png', title: 'Etapa do SDPREJ' },
  { dir: 'gdis', file: 'gdis-nivel.png', title: 'Nível de Escalação' }
];

console.log('📸 Upload de Screenshots para o Confluence\n');

function uploadMultipart(urlStr, fileBuffer, filename, auth) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(7);

    // Monta o multipart manualmente
    const lines = [];
    lines.push(`--${boundary}`);
    lines.push(`Content-Disposition: form-data; name="file"; filename="${filename}"`);
    lines.push(`Content-Type: image/png`);
    lines.push('');

    const header = Buffer.from(lines.join('\r\n') + '\r\n', 'utf8');
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const body = Buffer.concat([header, fileBuffer, footer]);

    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'SDPREJ-Publisher/1.0',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        'X-Atlassian-Token': 'no-check'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: { raw: data.slice(0, 100) } });
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function uploadScreenshot(screenshot) {
  const filepath = path.join(__dirname, 'dist', 'screenshots', screenshot.dir, screenshot.file);

  if (!fs.existsSync(filepath)) {
    console.warn(`⚠️  ${screenshot.title.padEnd(35)} — arquivo não encontrado`);
    return null;
  }

  try {
    const filedata = fs.readFileSync(filepath);
    const res = await uploadMultipart(UPLOAD_URL, filedata, screenshot.file, auth);

    if (res.status === 200 && res.body && res.body.results && res.body.results[0]) {
      const attachment = res.body.results[0];
      const fileId = attachment.id;
      console.log(`✅ ${screenshot.title.padEnd(35)} → ${res.status}`);
      return { title: screenshot.title, url: `${BASE_URL}/download/attachments/${fileId}`, fileId };
    } else {
      console.warn(`⚠️  ${screenshot.title.padEnd(35)} — ${res.status}`);
      return null;
    }
  } catch (err) {
    console.error(`❌ ${screenshot.title.padEnd(35)} — ${err.message.slice(0, 40)}`);
    return null;
  }
}

(async () => {
  const uploads = [];

  for (const ss of screenshots) {
    const result = await uploadScreenshot(ss);
    if (result) uploads.push(result);
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ ${uploads.length}/${screenshots.length} screenshots enviados\n`);

  const manifest = {
    uploadedAt: new Date().toISOString(),
    screenshots: uploads
  };

  fs.writeFileSync(
    path.join(__dirname, 'dist', 'screenshots-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  console.log('📝 Manifest salvo em: dist/screenshots-manifest.json\n');
  if (uploads.length > 0) {
    console.log('✅ Próxima etapa: node generate-confluence-com-imagens.js && node publish-confluence.js');
  }
})();
