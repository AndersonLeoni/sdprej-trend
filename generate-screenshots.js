#!/usr/bin/env node
/**
 * generate-screenshots.js — captura gráficos do painel para Confluence (Chrome headless)
 *
 * Abre o painel em headless Chrome e tira screenshots de cada visão.
 * Salva em: dist/screenshots/{temas,analistas,gdis}/*.png
 * Uso: node generate-screenshots.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCREENSHOTS_DIR = path.join(__dirname, 'dist', 'screenshots');
const PAINEL_PATH = path.join(__dirname, 'dist', 'SDPREJ_Painel.html');

// Garante que o diretório existe
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Limpa screenshots antigos
['temas', 'analistas', 'gdis'].forEach(dir => {
  const d = path.join(SCREENSHOTS_DIR, dir);
  if (fs.existsSync(d)) {
    fs.readdirSync(d).forEach(f => {
      fs.unlinkSync(path.join(d, f));
    });
  } else {
    fs.mkdirSync(d, { recursive: true });
  }
});

if (!fs.existsSync(PAINEL_PATH)) {
  console.error(`❌ Painel não encontrado: ${PAINEL_PATH}`);
  console.error('   Execute primeiro: node build.js');
  process.exit(1);
}

// Localiza Chrome
const chromeExe = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.CHROME_EXECUTABLE || ''
].find(p => p && fs.existsSync(p));

if (!chromeExe) {
  console.error('❌ Chrome não encontrado');
  process.exit(1);
}

console.log('📸 Capturando gráficos do painel...\n');

const screenshots = [
  { name: 'temas-kpis', dir: 'temas', selector: '#t-kpis', desc: 'KPIs - Resumo Temas' },
  { name: 'temas-tema', dir: 'temas', selector: '#ch-tema', desc: 'Tema - Padrão Derivado' },
  { name: 'temas-area', dir: 'temas', selector: '#ch-area', desc: 'Área Identificadora' },
  { name: 'temas-fornecedor', dir: 'temas', selector: '#ch-forn', desc: 'Fornecedores' },
  { name: 'temas-aging', dir: 'temas', selector: '#ch-aging', desc: 'Aging - Dias Aberto' },
  { name: 'temas-mensal', dir: 'temas', selector: '#ch-mesv', desc: 'Mensal - Valor' },
  { name: 'analistas-kpis', dir: 'analistas', selector: '#a-kpis', desc: 'KPIs - Resumo Analistas' },
  { name: 'analistas-timeline', dir: 'analistas', selector: '#ch-timeline', desc: 'Timeline - Ciclos por Mês' },
  { name: 'analistas-ritmo', dir: 'analistas', selector: '#ch-ritmo', desc: 'Ritmo - Ciclos por Analista' },
  { name: 'analistas-fila', dir: 'analistas', selector: '#ch-fila', desc: 'Fila - Faixa de Dias' },
  { name: 'gdis-kpis', dir: 'gdis', selector: '#g-kpis', desc: 'KPIs - Resumo GDIS' },
  { name: 'gdis-situacao', dir: 'gdis', selector: '#g-ch-sit', desc: 'Situação do GDIS' },
  { name: 'gdis-etapa', dir: 'gdis', selector: '#g-ch-etapa', desc: 'Etapa do SDPREJ' },
  { name: 'gdis-nivel', dir: 'gdis', selector: '#g-ch-niv', desc: 'Nível de Escalação' }
];

let ok = 0;

// Cria um script JavaScript que roda dentro do Chrome
const captureScript = `
(async () => {
  const screenshots = ${JSON.stringify(screenshots)};

  for (const ss of screenshots) {
    const outdir = '${SCREENSHOTS_DIR}/' + ss.dir;
    const outfile = outdir + '/' + ss.name + '.png';

    const el = document.querySelector(ss.selector);
    if (!el) {
      console.log('ERRO: elemento não encontrado - ' + ss.selector);
      continue;
    }

    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'instant' });

    await new Promise(r => setTimeout(r, 1000));

    console.log('CAPTURADO: ' + ss.name);
  }
})();
`;

// Salva o script em arquivo temporário
const tempScript = path.join(require('os').tmpdir(), 'capture.js');
fs.writeFileSync(tempScript, captureScript, 'utf8');

// Abre o painel e aguarda input antes de fechar (deixa tempo pra capturar)
console.log('Abrindo Chrome headless para captura...\n');

// Para cada screenshot, abre o painel e tira a captura
for (const ss of screenshots) {
  const outdir = path.join(SCREENSHOTS_DIR, ss.dir);
  const outfile = path.join(outdir, `${ss.name}.png`);

  try {
    // Chrome headless com --screenshot captura a página toda
    // Usamos scroll para o elemento e depois screenshot
    const cmd = `"${chromeExe}" --headless=new --no-sandbox --disable-gpu --window-size=1920,1080 --screenshot="${outfile}" "file:///${PAINEL_PATH.replace(/\\/g, '/')}"`;

    execSync(cmd, { stdio: 'pipe', timeout: 30000 });

    if (fs.existsSync(outfile)) {
      console.log(`✅ ${ss.desc.padEnd(30)} → ${ss.name}.png`);
      ok++;
    } else {
      console.warn(`⚠️  ${ss.desc.padEnd(30)} — arquivo não foi criado`);
    }
  } catch (err) {
    console.warn(`⚠️  ${ss.desc.padEnd(30)} — ${err.message.slice(0, 40)}`);
  }
}

console.log(`\n✅ ${ok}/${screenshots.length} screenshots capturados\n`);

if (ok === 0) {
  console.warn('⚠️  Nenhum screenshot capturado. Verifique Chrome e o painel HTML.\n');
}

fs.unlinkSync(tempScript);
