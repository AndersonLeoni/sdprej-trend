#!/usr/bin/env node
/**
 * valida-xhtml.js — confere o HTML antes de enviar ao Confluence.
 *
 * O Confluence rejeita o corpo com 400 e uma mensagem crua de parser XHTML.
 * Descobrir isso pela recusa da API custa uma rodada inteira da rotina, entao
 * as duas armadilhas que ja nos morderam sao checadas aqui:
 *
 *   1. atributo duplicado na mesma tag (ex.: dois `style`, de concatenacao
 *      condicional mal feita) — foi o 400 de 30/09/2026;
 *   2. entidade HTML que XHTML nao conhece (&nbsp; e companhia): em XHTML so
 *      valem &amp; &lt; &gt; &quot; &apos; e as numericas.
 *
 * Uso: node valida-xhtml.js arquivo.html [outro.html ...]
 * Sai com codigo 1 se achar problema, para abortar a rotina antes do envio.
 */

'use strict';

const fs = require('fs');

const ENTIDADES_OK = new Set(['amp', 'lt', 'gt', 'quot', 'apos']);

function linhaDe(txt, pos) {
  return txt.slice(0, pos).split('\n').length;
}

function valida(arq) {
  if (!fs.existsSync(arq)) {
    console.error(`  ${arq}: arquivo nao encontrado`);
    return 1;
  }
  const h = fs.readFileSync(arq, 'utf8');
  const problemas = [];

  /* --- 1. atributo duplicado ------------------------------------------- */
  /* pega tags de abertura; ignora comentarios e fechamento */
  const RE_TAG = /<([a-zA-Z][\w:-]*)((?:[^<>"']|"[^"]*"|'[^']*')*)>/g;
  for (const m of h.matchAll(RE_TAG)) {
    const [inteiro, tag, attrs] = m;
    if (!attrs || !attrs.trim()) continue;

    const vistos = new Map();
    const RE_ATTR = /([\w:-]+)\s*=\s*(?:"[^"]*"|'[^']*')/g;
    for (const a of attrs.matchAll(RE_ATTR)) {
      const nome = a[1].toLowerCase();
      vistos.set(nome, (vistos.get(nome) || 0) + 1);
    }
    for (const [nome, n] of vistos) {
      if (n > 1) {
        problemas.push(`linha ${linhaDe(h, m.index)}: <${tag}> tem ${n}x o atributo '${nome}'` +
          `\n      ${inteiro.slice(0, 120).replace(/\n/g, ' ')}`);
      }
    }
  }

  /* --- 2. entidade desconhecida ---------------------------------------- */
  for (const m of h.matchAll(/&([a-zA-Z][a-zA-Z0-9]*);/g)) {
    if (!ENTIDADES_OK.has(m[1])) {
      problemas.push(`linha ${linhaDe(h, m.index)}: entidade '&${m[1]};' nao existe em XHTML ` +
        `(use o caractere literal ou a forma numerica)`);
    }
  }

  const unicos = [...new Set(problemas)];
  if (unicos.length) {
    console.error(`\n  ${arq}: ${unicos.length} problema(s)`);
    unicos.slice(0, 15).forEach(p => console.error(`    - ${p}`));
    if (unicos.length > 15) console.error(`    ... e mais ${unicos.length - 15}`);
    return 1;
  }
  console.log(`  ${arq}: ok`);
  return 0;
}

const arqs = process.argv.slice(2);
if (!arqs.length) {
  console.error('uso: node valida-xhtml.js arquivo.html [...]');
  process.exit(2);
}

console.log('Validando XHTML para o Confluence...');
const falhas = arqs.reduce((n, a) => n + valida(a), 0);
if (falhas) {
  console.error(`\nAbortado: ${falhas} arquivo(s) com problema. O Confluence recusaria com 400.\n`);
  process.exit(1);
}
console.log('Tudo validado.\n');
