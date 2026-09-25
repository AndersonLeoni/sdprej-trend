#!/usr/bin/env node
/**
 * update-panel.js — aplica as três mudanças da Fase 1
 *
 * Executa: node update-panel.js
 * Depois:  git add -A && git commit -m "Fase 1: visao por departamento, filtros na fila"
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'src/app.js');
let src = fs.readFileSync(FILE, 'utf8');
const orig = src;

console.log('Aplicando Fase 1 — três mudanças...\n');

// ========================================================================
// MUDANÇA 1: Novo gráfico "Valor por Departamento" na ViewTemas
// ========================================================================
const mut1_old = `    hbarsInto('ch-forn',toRows(agg(rows,'fornecedor',12),rows.length),{fmt:fmtBar});
    hbarsInto('ch-cli',toRows(agg(rows,'cliente',12),rows.length),{fmt:fmtBar});

    const ag=agg(rows,'aging',null,AG);`;

const mut1_new = `    hbarsInto('ch-forn',toRows(agg(rows,'fornecedor',12),rows.length),{fmt:fmtBar});
    hbarsInto('ch-cli',toRows(agg(rows,'cliente',12),rows.length),{fmt:fmtBar});

    /* Novo: Valor por departamento responsável (estado atual) */
    const dept=agg(rows,'areaFalha',12);
    const m_save=metric; metric='valor';
    hbarsInto('ch-dept',toRows(dept,rows.length),{fmt:fmtBar});
    document.getElementById('cs-dept').innerHTML=
      dept.length?'Valor acumulado por departamento responsável. Liderança: <b>'+esc(dept[0].name)+'</b> com R$ '+nfBRL2.format(dept[0].valor)+'.'
      :'Sem dados.';
    metric=m_save;

    const ag=agg(rows,'aging',null,AG);`;

if (src.includes(mut1_old)) {
  src = src.replace(mut1_old, mut1_new);
  console.log('✅ Mudança 1: gráfico "Valor por Departamento" inserido');
} else {
  console.warn('⚠️  Mudança 1 não encontrada (contexto pode ter mudado)');
}

// ========================================================================
// MUDANÇA 2: Adicionar filtro de faixa de dias na ViewAna
// ========================================================================
const mut2_old = `  ['fAnalista','fPeriodo'].forEach(id=>document.getElementById(id)
    .addEventListener('change',()=>{shown=100;render();}));`;

const mut2_new = `  ['fAnalista','fPeriodo','fFaixa'].forEach(id=>document.getElementById(id)
    .addEventListener('change',()=>{shown=100;render();}));`;

if (src.includes(mut2_old)) {
  src = src.replace(mut2_old, mut2_new);
  console.log('✅ Mudança 2a: listener do filtro fFaixa adicionado');
} else {
  console.warn('⚠️  Mudança 2a não encontrada');
}

// Adicionar lógica de filtro de faixa na função scoped()
const mut2b_old = `  function scoped(){
    const cut=cutoff(), ok=m=>!cut||(m&&m>=cut);
    return {
      ciclos:DA.ciclos.filter(c=>anaMatch(c.analista)&&ok(c.mes)),
      areas:DA.areas.filter(a=>anaMatch(a.autor)&&ok(a.mes)),
      fila:DA.fila.filter(f=>anaMatch(f.enviadoPor)&&ok(f.mesEnvio)),
      months:MONTHS.filter(ok)
    };
  }`;

const mut2b_new = `  function scoped(){
    const cut=cutoff(), ok=m=>!cut||(m&&m>=cut);
    const faixa=document.getElementById('fFaixa').value;
    const filaFiltrada=DA.fila.filter(f=>anaMatch(f.enviadoPor)&&ok(f.mesEnvio)&&(!faixa||f.faixa===faixa));
    return {
      ciclos:DA.ciclos.filter(c=>anaMatch(c.analista)&&ok(c.mes)),
      areas:DA.areas.filter(a=>anaMatch(a.autor)&&ok(a.mes)),
      fila:filaFiltrada,
      months:MONTHS.filter(ok)
    };
  }`;

if (src.includes(mut2b_old)) {
  src = src.replace(mut2b_old, mut2b_new);
  console.log('✅ Mudança 2b: lógica de filtro por faixa em scoped()');
} else {
  console.warn('⚠️  Mudança 2b não encontrada');
}

// ========================================================================
// MUDANÇA 3: Preencher fFaixa no preencheSeletor()
// ========================================================================
const mut3_old = `  (function preencheSeletor(){
    const sel=document.getElementById('fAnalista');
    FOCO.forEach(f=>{
      const o=document.createElement('option');
      o.value=f.nome; o.textContent=f.curto; sel.appendChild(o);
    });
    const o=document.createElement('option');
    o.value='__outros'; o.textContent=FOCO.length?'Demais analistas':'Todos os analistas';
    sel.appendChild(o);
  })();`;

const mut3_new = `  (function preencheSeletor(){
    const sel=document.getElementById('fAnalista');
    FOCO.forEach(f=>{
      const o=document.createElement('option');
      o.value=f.nome; o.textContent=f.curto; sel.appendChild(o);
    });
    const o=document.createElement('option');
    o.value='__outros'; o.textContent=FOCO.length?'Demais analistas':'Todos os analistas';
    sel.appendChild(o);

    /* Preencher faixa de dias na fila */
    const selF=document.getElementById('fFaixa');
    FQ.forEach(f=>{
      const opt=document.createElement('option');
      opt.value=f; opt.textContent=f; selF.appendChild(opt);
    });
  })();`;

if (src.includes(mut3_old)) {
  src = src.replace(mut3_old, mut3_new);
  console.log('✅ Mudança 3: seletor fFaixa preenchido com FQ');
} else {
  console.warn('⚠️  Mudança 3 não encontrada');
}

// ========================================================================
// Salvar e verificar
// ========================================================================
if (src === orig) {
  console.error('\n❌ Nenhuma mudança foi aplicada — contexto não encontrado.');
  console.error('Verifique se o app.js não foi alterado manualmente.');
  process.exit(1);
}

fs.writeFileSync(FILE, src, 'utf8');
console.log(`\n✅ ${FILE} atualizado com sucesso!\n`);
console.log('Próximos passos:');
console.log('  git add src/app.js');
console.log('  git commit -m "Fase 1: valor por departamento e filtros na fila"');
console.log('  git push origin main');
