#!/usr/bin/env node
/**
 * build.js — monta o painel unico e autocontido.
 *
 *   src/template.html  +  src/app.css  +  src/app.js  +  data/*.json
 *        -> dist/SDPREJ_Painel.html
 *
 * O entregavel continua sendo UM arquivo, sem dependencia externa, que abre
 * offline por copia. O repositorio guarda as pecas; este script monta.
 *
 * Se config.json tiver "saida", o arquivo pronto tambem e copiado para la
 * (pasta do Teams, OneDrive, SharePoint sincronizado — o script nao muda).
 *
 * Uso:  node build.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const p = (...a) => path.join(ROOT, ...a);
const read = f => fs.readFileSync(p(f), 'utf8');

/* o template foi recortado com LF; o build preserva isso */
const EOL = '\n';

/* os tres payloads, na ordem em que o app.js os consome */
const DADOS = [
  { nome: 'DT', arq: 'data/temas.json' },
  { nome: 'DA', arq: 'data/analistas.json' },
  { nome: 'GD', arq: 'data/gdis.json' },
];

function main() {
  const faltando = ['src/template.html', 'src/app.css', 'src/app.js', ...DADOS.map(d => d.arq)]
    .filter(f => !fs.existsSync(p(f)));
  if (faltando.length) {
    console.error('Faltam arquivos:\n  ' + faltando.join('\n  '));
    console.error('\nOs payloads vivem em data/ e nao sao versionados.');
    console.error('Rode  node extract/run.js  para gera-los a partir do Jira.');
    process.exit(1);
  }

  /* --- dado: injetado como texto bruto, sem reserializar ---------------- */
  const blocos = [];
  const carimbos = {};
  for (const { nome, arq } of DADOS) {
    const txt = read(arq).trim();
    let obj;
    try {
      obj = JSON.parse(txt);
    } catch (e) {
      console.error(`${arq} nao e JSON valido: ${e.message}`);
      process.exit(1);
    }
    carimbos[nome] = obj.geradoEm || '(sem carimbo)';
    if (nome === 'GD') {
      blocos.push('');
      blocos.push('/* ===================== dados: vinculo SDPREJ x GDIS ===================== */');
    }
    blocos.push(`const ${nome} = ${txt};`);
  }
  blocos.push('');
  const dados = blocos.join(EOL);

  /* --- css e js: o template ja tem a quebra de linha em volta do marcador,
         entao a quebra final do arquivo sai aqui para nao duplicar -------- */
  const semQuebraFinal = s => s.replace(/\r?\n$/, '');

  let html = read('src/template.html')
    .replace('@@CSS@@',  () => semQuebraFinal(read('src/app.css')))
    .replace('@@DATA@@', () => dados)
    .replace('@@JS@@',   () => semQuebraFinal(read('src/app.js')))
    .replace('@@NOTA_DERIVA@@', () => notaDeriva(carimbos));

  const sobrou = html.match(/@@[A-Z]+@@/g);
  if (sobrou) {
    console.error('Marcador nao substituido no template: ' + [...new Set(sobrou)].join(', '));
    process.exit(1);
  }

  html = html.replace(/\r?\n*$/, '') + EOL;

  fs.mkdirSync(p('dist'), { recursive: true });
  const destino = p('dist', 'SDPREJ_Painel.html');
  fs.writeFileSync(destino, html, 'utf8');

  const kb = n => (n / 1024).toFixed(0).padStart(4) + ' KB';
  console.log('painel montado: ' + destino);
  console.log('  tamanho  ' + kb(Buffer.byteLength(html)) + '  (' + Buffer.byteLength(html) + ' bytes)');
  for (const { nome } of DADOS) console.log('  ' + nome + '       extraido em ' + carimbos[nome]);

  /* --- publicacao opcional ---------------------------------------------- */
  let cfg = {};
  if (fs.existsSync(p('config.json'))) {
    let rawData = read('config.json');
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
    cfg = JSON.parse(rawData);
  }
  if (cfg.saida) {
    try {
      fs.mkdirSync(path.dirname(cfg.saida), { recursive: true });
      fs.copyFileSync(destino, cfg.saida);
      console.log('  publicado em ' + cfg.saida);
    } catch (e) {
      console.error('  FALHA ao publicar em ' + cfg.saida + ': ' + e.message);
      process.exitCode = 1;
    }
  }
}

/**
 * Aviso de deriva entre extracoes — escrito a partir do dado, nao fixo.
 *
 * Quando as tres visoes saem da mesma passada (o que `extract/run.js` garante),
 * os tres carimbos sao iguais e nao ha nada a explicar: a nota nao aparece.
 * Quando alguem extrai uma visao sozinha, os totais de uma mesma etapa passam a
 * discordar entre visoes — foi o que aconteceu na versao montada a mao, com 652
 * chamados as 12:06 e 647 as 16:21. Nesse caso a nota tem de estar la, porque
 * sem ela o leitor ve dois numeros para a mesma coisa e conclui que o painel
 * esta errado. Deixar o texto fixo seria pior: ele viraria mentira na primeira
 * extracao limpa.
 */
function notaDeriva(carimbos) {
  const dts = [...new Set(Object.values(carimbos))];
  if (dts.length <= 1) return '';
  const pares = Object.entries(carimbos)
    .map(([n, d]) => `${NOME_VISAO[n] || n} em ${d}`).join(' &middot; ');
  return '  As três visões foram extraídas em <b>momentos diferentes</b> ' +
         `(${pares}), então o total de uma mesma etapa pode discordar entre elas — ` +
         'chamados entram e saem da fila ao longo do dia. O carimbo no topo acompanha ' +
         'a visão aberta. Uma extração feita por <code>extract/run.js</code> não tem ' +
         'essa deriva: as três saem da mesma passada.<br>\n';
}

const NOME_VISAO = { DT: 'visão por tema', DA: 'visão por analista', GD: 'vínculo com GDIS' };

main();
