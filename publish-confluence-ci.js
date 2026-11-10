#!/usr/bin/env node
/**
 * publish-confluence-ci.js — anexa o painel (HTML completo) à página do Confluence.
 *
 * Uso:  node publish-confluence-ci.js [arquivo.html] [--dry]
 *   arquivo.html  padrão: dist/SDPREJ_Painel.html (no CI: public/index.html)
 *   --dry         só consulta (GET); não envia nada
 *
 * Credenciais: JIRA_EMAIL / JIRA_TOKEN (variáveis de ambiente; as mesmas do Jira).
 *
 * O que faz, nesta ordem:
 *  1. Procura o anexo SDPREJ_Painel.html na página. Se existe, envia uma NOVA VERSÃO
 *     do mesmo anexo (o link nunca muda); se não existe, cria.
 *  2. Se o corpo da página ainda não referencia o anexo, ACRESCENTA um parágrafo com o
 *     link no topo (uma única vez; o resto do corpo não é tocado).
 *
 * O Confluence não executa o HTML do painel: quem abre o anexo baixa o arquivo e abre
 * no navegador. Para ver renderizado no navegador, é preciso o GitLab Pages.
 * Zero dependências (Node 18+).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const PAGE_ID = '12787154969';
const WIKI = 'https://cvccorp.atlassian.net/wiki';
const NOME = 'SDPREJ_Painel.html';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const arquivo = path.resolve(args.find(a => !a.startsWith('--')) || path.join(__dirname, 'dist', NOME));

const EMAIL = process.env.JIRA_EMAIL, TOKEN = process.env.JIRA_TOKEN;
if (!EMAIL || !TOKEN) { console.error('JIRA_EMAIL / JIRA_TOKEN nao definidos.'); process.exit(1); }
if (!fs.existsSync(arquivo)) { console.error('Arquivo nao encontrado: ' + arquivo); process.exit(1); }
const AUTH = 'Basic ' + Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');

function req(method, url, { json, multipart } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = { Authorization: AUTH, Accept: 'application/json', 'User-Agent': 'SDPREJ-CI/1.0' };
    let body = null;
    if (json) { body = Buffer.from(JSON.stringify(json)); headers['Content-Type'] = 'application/json'; }
    if (multipart) { body = multipart.body; headers['Content-Type'] = multipart.type; headers['X-Atlassian-Token'] = 'no-check'; }
    if (body) headers['Content-Length'] = body.length;
    const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, method, headers }, res => {
      const ch = []; res.on('data', c => ch.push(c));
      res.on('end', () => {
        const txt = Buffer.concat(ch).toString('utf8');
        let parsed = null; try { parsed = txt ? JSON.parse(txt) : null; } catch { /* nao-JSON */ }
        if (res.statusCode >= 400) return reject(new Error(`${res.statusCode} ${method} ${u.pathname}: ${(parsed && parsed.message) || txt.slice(0, 200)}`));
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

function montaMultipart(buf, comentario) {
  const b = '----sdprej' + Date.now().toString(16);
  const campo = (n, v) => Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="${n}"\r\n\r\n${v}\r\n`);
  return {
    type: `multipart/form-data; boundary=${b}`,
    body: Buffer.concat([
      Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="file"; filename="${NOME}"\r\nContent-Type: text/html\r\n\r\n`),
      buf, Buffer.from('\r\n'),
      campo('comment', comentario), campo('minorEdit', 'true'),
      Buffer.from(`--${b}--\r\n`),
    ]),
  };
}

(async () => {
  const buf = fs.readFileSync(arquivo);
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  console.log(`Arquivo: ${arquivo} (${(buf.length / 1024).toFixed(0)} KB)${DRY ? '  [DRY-RUN]' : ''}`);

  // 1. anexo
  const lista = await req('GET', `${WIKI}/rest/api/content/${PAGE_ID}/child/attachment?filename=${encodeURIComponent(NOME)}`);
  const existente = lista.body.results && lista.body.results[0];
  console.log(existente ? `Anexo existente: ${existente.id} (versao ${existente.version && existente.version.number})` : 'Anexo ainda nao existe.');

  // 2. corpo da pagina
  const pg = await req('GET', `${WIKI}/rest/api/content/${PAGE_ID}?expand=version,body.storage`);
  const corpo = pg.body.body.storage.value;
  const precisaLink = !corpo.includes(NOME);
  console.log(precisaLink ? 'Pagina ainda nao referencia o anexo: link sera acrescentado no topo.' : 'Pagina ja referencia o anexo.');

  if (DRY) { console.log('DRY-RUN: nada foi enviado.'); return; }

  const mp = montaMultipart(buf, `Atualizado automaticamente em ${agora} (pipeline GitLab)`);
  const url = existente
    ? `${WIKI}/rest/api/content/${PAGE_ID}/child/attachment/${existente.id}/data`
    : `${WIKI}/rest/api/content/${PAGE_ID}/child/attachment`;
  const up = await req('POST', url, { multipart: mp });
  console.log(`Anexo enviado (HTTP ${up.status}).`);

  if (precisaLink) {
    const link = `<p><strong>Painel SDPREJ (arquivo HTML completo, atualizado diariamente):</strong> ` +
      `<ac:link><ri:attachment ri:filename="${NOME}" /></ac:link> ` +
      `— baixe e abra no navegador.</p>`;
    await req('PUT', `${WIKI}/rest/api/content/${PAGE_ID}`, { json: {
      version: { number: pg.body.version.number + 1, message: 'Link para o anexo do painel' },
      title: pg.body.title, type: 'page',
      body: { storage: { value: link + corpo, representation: 'storage' } },
    } });
    console.log('Link acrescentado no topo da pagina.');
  }
  console.log(`Concluido: ${WIKI}/spaces/PNCT/pages/${PAGE_ID}`);
})().catch(e => {
  console.error('ERRO: ' + e.message);
  if (/401|403/.test(e.message)) console.error('Credenciais invalidas, sem permissao na pagina ou IP fora da allowlist do Confluence.');
  process.exit(1);
});
