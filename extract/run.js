#!/usr/bin/env node
/**
 * run.js — extrai os tres payloads do Jira para data/.
 *
 *   node extract/run.js              todos os tres
 *   node extract/run.js temas gdis   so os indicados
 *
 * As tres visoes compartilham UM carimbo de data, porque rodam na mesma
 * passada. Isso conserta um defeito visivel do painel antigo: as extracoes
 * eram avulsas e davam 652, 651 e 647 chamados na mesma etapa em horarios
 * diferentes do mesmo dia. Quem lia o painel via tres numeros para a mesma
 * coisa e nao tinha como saber que eram tres fotografias.
 *
 * O JSON sai COMPACTO de proposito: o build.js injeta o texto como esta,
 * e formatar com indentacao dobraria o tamanho do painel.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const jira = require('./jira');

const RAIZ = path.join(__dirname, '..');
const DADOS = path.join(RAIZ, 'data');

const VISOES = {
  temas:     { arq: 'temas.json',     mod: './temas',     rotulo: 'visao por tema' },
  analistas: { arq: 'analistas.json', mod: './analistas', rotulo: 'visao por analista' },
  gdis:      { arq: 'gdis.json',      mod: './gdis',      rotulo: 'vinculo com GDIS' },
};

async function main() {
  const pedidas = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const alvos = pedidas.length ? pedidas : Object.keys(VISOES);

  const invalidas = alvos.filter(a => !VISOES[a]);
  if (invalidas.length) {
    console.error('Visao desconhecida: ' + invalidas.join(', '));
    console.error('Validas: ' + Object.keys(VISOES).join(', '));
    process.exit(1);
  }

  const cfg = jira.cfg();
  cfg.universo = cfg.universo || `filter in ("${cfg.filtro || 10478}") AND project = SDPREJ`;

  /* UM instante para as tres visoes — ver o comentario do cabecalho. */
  const agora = new Date();

  console.error('Jira:     ' + jira.base());
  console.error('Universo: ' + cfg.universo);

  /* Contagem barata antes de tudo: se o universo vier vazio ou absurdo, e
     melhor descobrir agora do que depois de 40 s de changelog. */
  const total = await jira.contar(cfg.universo);
  console.error('Total:    ' + total + ' chamados\n');
  if (!total) {
    console.error('O universo voltou vazio. Confira o filtro em config.json e a permissao do token.');
    process.exit(1);
  }

  fs.mkdirSync(DADOS, { recursive: true });

  const t0 = Date.now();
  for (const nome of alvos) {
    const v = VISOES[nome];
    const ti = Date.now();
    console.error(v.rotulo + ':');
    const payload = await require(v.mod).montar(cfg, agora);

    const destino = path.join(DADOS, v.arq);
    const txt = JSON.stringify(payload);
    gravaComSeguranca(destino, txt);

    const kb = (Buffer.byteLength(txt) / 1024).toFixed(0);
    console.error(`  gravado ${v.arq}  ${kb} KB  em ${((Date.now() - ti) / 1000).toFixed(1)}s\n`);
  }

  console.error(`Pronto em ${((Date.now() - t0) / 1000).toFixed(1)}s. Agora: node build.js`);
}

/**
 * Grava em arquivo temporario e so depois renomeia.
 *
 * Sem isto, uma falha de rede no meio da escrita deixaria data/temas.json
 * truncado, e o build seguinte produziria um painel quebrado com aparencia
 * de painel bom. O rename e atomico: ou o arquivo antigo continua inteiro,
 * ou o novo esta completo.
 */
function gravaComSeguranca(destino, txt) {
  JSON.parse(txt);                    // confere antes de trocar o arquivo bom
  const tmp = destino + '.parcial';
  fs.writeFileSync(tmp, txt, 'utf8');
  fs.renameSync(tmp, destino);
}

main().catch(e => {
  console.error('\nFALHOU: ' + e.message);
  process.exit(1);
});
