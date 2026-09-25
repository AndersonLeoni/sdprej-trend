#!/usr/bin/env node
/**
 * server.js — Servidor HTTP pra servir o painel SDPREJ
 *
 * Uso: node server.js
 * Acessa: http://localhost:8000/SDPREJ_Painel.html
 *
 * Sirva via Confluence com um iframe:
 * <iframe src="http://localhost:8000/SDPREJ_Painel.html" width="100%" height="800"></iframe>
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const DIST_DIR = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  // CORS pra funcionar em iframe
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Redireciona raiz pro painel
  if (req.url === '/') {
    res.writeHead(301, { 'Location': '/SDPREJ_Painel.html' });
    res.end();
    return;
  }

  // Serve arquivo
  let filepath = path.join(DIST_DIR, req.url);

  // Security: evita path traversal
  if (!filepath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Se for diretório, tenta index.html
  if (fs.existsSync(filepath) && fs.statSync(filepath).isDirectory()) {
    filepath = path.join(filepath, 'index.html');
  }

  // Se não existir, retorna 404
  if (!fs.existsSync(filepath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  // Lê e serve o arquivo
  const ext = path.extname(filepath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filepath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`
📡 Servidor SDPREJ iniciado!

   🌐 http://localhost:${PORT}/SDPREJ_Painel.html

   Use no Confluence:
   <iframe src="http://localhost:${PORT}/SDPREJ_Painel.html" width="100%" height="800"></iframe>

   Pressione CTRL+C para parar.
`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Porta ${PORT} já está em uso`);
    console.error('   Feche a instância anterior ou use outra porta');
  } else {
    console.error('❌ Erro no servidor:', err.message);
  }
  process.exit(1);
});
