#!/usr/bin/env node
/**
 * check-attachments.js — verifica quais attachments foram realmente salvos
 */

const https = require('https');

const PAGE_ID = '12787154969';
const BASE_URL = 'https://cvccorp.atlassian.net/wiki';
const EMAIL = process.env.JIRA_EMAIL;
const TOKEN = process.env.JIRA_TOKEN;

if (!EMAIL || !TOKEN) {
  console.error('❌ Credenciais ausentes');
  process.exit(1);
}

const auth = Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'SDPREJ-Publisher/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: { raw: data.slice(0, 200) } });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

(async () => {
  console.log('📋 Verificando attachments da página...\n');

  try {
    const res = await httpsGet(
      `${BASE_URL}/rest/api/content/${PAGE_ID}/child/attachment?limit=100`
    );

    if (res.status !== 200) {
      console.error(`❌ Erro ${res.status}`);
      console.log(JSON.stringify(res.body, null, 2));
      return;
    }

    const attachments = res.body.results || [];
    console.log(`✅ Total de attachments: ${attachments.length}\n`);

    // Mapeamento de filename para título descritivo
    const filenameTitles = {
      'temas-kpis.png': 'KPIs - Resumo Temas',
      'temas-tema.png': 'Tema - Padrão Derivado',
      'temas-area.png': 'Área Identificadora',
      'temas-fornecedor.png': 'Fornecedores / Hotéis',
      'temas-aging.png': 'Aging - Dias Aberto',
      'temas-mensal.png': 'Mensal - Valor',
      'analistas-kpis.png': 'KPIs - Resumo Analistas',
      'analistas-timeline.png': 'Timeline - Ciclos por Mês',
      'analistas-ritmo.png': 'Ritmo - Ciclos por Analista',
      'analistas-fila.png': 'Fila - Faixa de Dias',
      'gdis-kpis.png': 'KPIs - Resumo GDIS',
      'gdis-situacao.png': 'Situação do GDIS',
      'gdis-etapa.png': 'Etapa do SDPREJ',
      'gdis-nivel.png': 'Nível de Escalação'
    };

    attachments.forEach((att, i) => {
      const downloadUrl = `${BASE_URL}/download/attachments/${att.id}`;
      const title = filenameTitles[att.title] || att.title;
      console.log(`${i + 1}. ${title}`);
      console.log(`   Arquivo: ${att.title}`);
      console.log(`   ID: ${att.id}`);
      console.log(`   URL: ${downloadUrl}`);
      console.log('');
    });

    // Gera manifest correto
    const fs = require('fs');
    const path = require('path');
    const manifest = {
      uploadedAt: new Date().toISOString(),
      screenshots: attachments.map(att => ({
        title: filenameTitles[att.title] || att.title,
        url: `${BASE_URL}/download/attachments/${att.id}`,
        fileId: att.id
      }))
    };

    fs.writeFileSync(
      path.join(__dirname, 'dist', 'screenshots-manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    console.log('✅ Manifest atualizado com URLs corretas!\n');
    console.log('Próxima etapa: node generate-confluence-com-imagens.js && node publish-confluence.js');

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
})();
