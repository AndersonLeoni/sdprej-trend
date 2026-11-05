#!/usr/bin/env node
/**
 * build-trend.js — monta o painel APOIO Trend, unico e autocontido.
 *
 *   src/trend.template.html + src/app.css + src/trend.js + data/trend.json
 *        -> dist/Trend_Painel.html
 *
 * Reaproveita o app.css do painel SDPREJ para manter o mesmo visual.
 * Se config.json tiver "saidaTrend", o arquivo pronto tambem e copiado para la.
 *
 * Uso:  node build-trend.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const p = (...a) => path.join(ROOT, ...a);
const read = f => fs.readFileSync(p(f), 'utf8');
const semQuebraFinal = s => s.replace(/\r?\n$/, '');

const faltando = ['src/trend.template.html', 'src/app.css', 'src/trend.js', 'data/trend.json']
  .filter(f => !fs.existsSync(p(f)));
if (faltando.length) {
  console.error('Faltam arquivos:\n  ' + faltando.join('\n  '));
  console.error('\nRode  node extract/trend.js  para gerar o payload a partir do Jira.');
  process.exit(1);
}

const txt = read('data/trend.json').trim();
let obj;
try { obj = JSON.parse(txt); } catch (e) { console.error('data/trend.json invalido: ' + e.message); process.exit(1); }

let html = read('src/trend.template.html')
  .replace('@@CSS@@',  () => semQuebraFinal(read('src/app.css')))
  .replace('@@DATA@@', () => `const TR = ${txt};`)
  .replace('@@JS@@',   () => semQuebraFinal(read('src/trend.js')));

const sobrou = html.match(/@@[A-Z]+@@/g);
if (sobrou) { console.error('Marcador nao substituido: ' + [...new Set(sobrou)].join(', ')); process.exit(1); }

html = html.replace(/\r?\n*$/, '') + '\n';
fs.mkdirSync(p('dist'), { recursive: true });
const destino = p('dist', 'Trend_Painel.html');
fs.writeFileSync(destino, html, 'utf8');
console.log('painel montado: ' + destino);
console.log('  tamanho  ' + (Buffer.byteLength(html) / 1024).toFixed(0) + ' KB');
console.log('  extraido em ' + obj.geradoEm + '  (' + obj.rows.length + ' chamados)');

if (fs.existsSync(p('config.json'))) {
  let raw = read('config.json');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  const cfg = JSON.parse(raw);
  if (cfg.saidaTrend) {
    try {
      fs.mkdirSync(path.dirname(cfg.saidaTrend), { recursive: true });
      fs.copyFileSync(destino, cfg.saidaTrend);
      console.log('  publicado em ' + cfg.saidaTrend);
    } catch (e) {
      console.error('  FALHA ao publicar em ' + cfg.saidaTrend + ': ' + e.message);
      process.exitCode = 1;
    }
  }
}
