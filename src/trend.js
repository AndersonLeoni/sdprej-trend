/* ===================== helpers ===================== */
const nfInt=new Intl.NumberFormat('pt-BR');
const nf1=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MN=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const mLab=m=>{const[y,mm]=m.split('-');return MN[+mm-1]+'/'+y.slice(2);};
const JIRA='https://cvccorp.atlassian.net/browse/';
const NS='http://www.w3.org/2000/svg';
const mk=(t,a)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e;};
const $=id=>document.getElementById(id);
const pct=(a,n)=>n?100*a/n:null;
const fp=v=>v==null?'–':nf1.format(v)+'%';
const fi=v=>nfInt.format(v);
const diasEntre=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);

const tip=$('tip');
function showTip(e,html){
  tip.innerHTML=html; tip.style.opacity=1;
  const r=tip.getBoundingClientRect();
  let x=e.clientX+15,y=e.clientY+15;
  if(x+r.width>innerWidth-10) x=e.clientX-r.width-15;
  if(y+r.height>innerHeight-10) y=e.clientY-r.height-15;
  tip.style.left=x+'px'; tip.style.top=y+'px';
}
const hideTip=()=>tip.style.opacity=0;
function bindTip(el,html){
  el.addEventListener('mousemove',e=>showTip(e,html));
  el.addEventListener('mouseleave',hideTip);
}
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function legendInto(id,defs){
  $(id).innerHTML=defs.map(d=>`<span><i style="background:${d.color}"></i>${esc(d.label)}</span>`).join('');
}

function hbarsInto(mountId,rows,opt){
  opt=opt||{};
  const el=$(mountId); el.innerHTML='';
  if(!rows.length){ el.innerHTML='<div class="empty">Sem dados no recorte atual.</div>'; return; }
  const max=opt.max||Math.max(...rows.map(r=>r.value),1);
  rows.forEach(r=>{
    const row=document.createElement('div'); row.className='hrow';
    row.innerHTML=`<div class="hlab" title="${esc(r.name)}">${esc(r.name)}</div>`+
      `<div class="htrack"><div class="hfill" style="width:${(r.value/max*100).toFixed(2)}%;background:${r.color||'var(--series-1)'}"></div></div>`+
      `<div class="hval">${opt.fmt?opt.fmt(r):fi(r.value)}</div>`;
    bindTip(row,`<b>${esc(r.name)}</b>${r.tip||`<span>${fi(r.value)}</span>`}`);
    el.appendChild(row);
  });
}

/* barras verticais agrupadas; largura real do container, sem distorcer texto */
function barsInto(mountId,cats,series,opt){
  opt=opt||{};
  const el=$(mountId); el.innerHTML='';
  const W=Math.max(320,el.clientWidth||600),H=opt.h||270,mL=48,mR=10,mT=22,mB=34;
  const pw=W-mL-mR,ph=H-mT-mB;
  const max=Math.max(1,...series.flatMap(s=>s.values))*1.1;
  const svg=mk('svg',{viewBox:`0 0 ${W} ${H}`,role:'img'}); svg.style.height=H+'px';
  for(let t=0;t<=4;t++){
    const y=mT+ph-ph*t/4;
    svg.appendChild(mk('line',{x1:mL,x2:mL+pw,y1:y,y2:y,class:t?'gl':'axl'}));
    const lb=mk('text',{x:mL-8,y:y+3.5,class:'tk','text-anchor':'end'}); lb.textContent=fi(Math.round(max*t/4)); svg.appendChild(lb);
  }
  const step=pw/cats.length,n=series.length;
  const gw=Math.min(step-10,n>1?110:70),bw=Math.max(4,(gw-2*(n-1))/n);
  cats.forEach((c,i)=>{
    const gx=mL+i*step+(step-gw)/2;
    const g=mk('g',{});
    g.appendChild(mk('rect',{x:mL+i*step,y:mT,width:step,height:ph,fill:'transparent'}));
    const parcial=opt.parcial&&opt.parcial.includes(i);
    bindTip(g,`<b>${esc(c)}${parcial?' (parcial)':''}</b>`+series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.label)}: ${fi(s.values[i])}</span>`).join(''));
    svg.appendChild(g);
    series.forEach((s,j)=>{
      const v=s.values[i]; if(!v) return;
      const h=Math.max(2,v/max*ph),x=gx+j*(bw+2),y=mT+ph-h,rad=Math.min(4,h/2,bw/2);
      svg.appendChild(mk('path',{fill:s.color,opacity:parcial?.6:1,d:
        `M${x},${mT+ph} L${x},${y+rad} Q${x},${y} ${x+rad},${y} L${x+bw-rad},${y} Q${x+bw},${y} ${x+bw},${y+rad} L${x+bw},${mT+ph} Z`}));
      if(cats.length<=8){
        const t=mk('text',{x:x+bw/2,y:y-5,class:'dlab','text-anchor':'middle'}); t.textContent=fi(v); svg.appendChild(t);
      }
    });
    const lt=mk('text',{x:mL+i*step+step/2,y:H-12,class:'tk','text-anchor':'middle'}); lt.textContent=c+(parcial?'*':''); svg.appendChild(lt);
  });
  el.appendChild(svg);
}

/* linha de percentual 0-100; pts = [{cat, v (null = sem dado), n}] */
function lineInto(mountId,pts,color){
  const el=$(mountId); el.innerHTML='';
  const W=Math.max(320,el.clientWidth||600),H=250,mL=48,mR=22,mT=22,mB=34;
  const pw=W-mL-mR,ph=H-mT-mB;
  const svg=mk('svg',{viewBox:`0 0 ${W} ${H}`,role:'img'}); svg.style.height=H+'px';
  const y=v=>mT+ph*(1-v/100), x=i=>mL+(pts.length>1?pw*i/(pts.length-1):pw/2);
  [0,25,50,75,100].forEach(t=>{
    svg.appendChild(mk('line',{x1:mL,x2:mL+pw,y1:y(t),y2:y(t),class:t?'gl':'axl'}));
    const lb=mk('text',{x:mL-8,y:y(t)+3.5,class:'tk','text-anchor':'end'}); lb.textContent=t+'%'; svg.appendChild(lb);
  });
  const d=pts.map((p,i)=>p.v==null?null:`${i&&pts[i-1].v!=null?'L':'M'}${x(i)},${y(p.v)}`).filter(Boolean).join(' ');
  svg.appendChild(mk('path',{d,fill:'none',stroke:color,'stroke-width':2,'stroke-linejoin':'round'}));
  pts.forEach((p,i)=>{
    const lt=mk('text',{x:x(i),y:H-12,class:'tk','text-anchor':'middle'}); lt.textContent=p.cat; svg.appendChild(lt);
    if(p.v==null) return;
    const c=mk('circle',{cx:x(i),cy:y(p.v),r:5,fill:color,stroke:css('--surface-1'),'stroke-width':2});
    bindTip(c,`<b>${esc(p.cat)}${p.parcial?' (parcial)':''}</b><span>${fp(p.v)} no prazo</span><span>${fi(p.n)} chamados com SLA</span>`);
    svg.appendChild(c);
    const t=mk('text',{x:x(i),y:y(p.v)-11,class:'dlab','text-anchor':'middle'}); t.textContent=fp(p.v); svg.appendChild(t);
  });
  el.appendChild(svg);
}

/* ===================== dados e estado ===================== */
const D=TR.rows, WK=['m6','m4','m2'], WN={m6:'6 meses',m4:'4 meses',m2:'2 meses'};
const S={jan:'m6',tipo:'',resp:'',med:'ambos'};
const serieOn=k=>S.med==='ambos'||S.med===k;
const ini=k=>TR.janelas[k];
const rowsF=(ignoraResp)=>D.filter(r=>(S.tipo===''||r.t===+S.tipo)&&(ignoraResp||S.resp===''||r.a===+S.resp));
const nomeResp=a=>a<0?'(sem responsável)':TR.resp[a];

function stats(rows,st){
  const cr=rows.filter(r=>r.c>=st), rs=rows.filter(r=>r.r&&r.r>=st);
  const fr=cr.filter(r=>r.f>=0), q=cr.filter(r=>r.q>=0);
  return {cr:cr.length,rs:rs.length,saldo:cr.length-rs.length,ab:cr.filter(r=>!r.d).length,
    fn:fr.length,fok:fr.filter(r=>r.f===1).length,qn:q.length,qok:q.filter(r=>r.q===1).length};
}
function meses(){
  const out=[]; let [y,m]=TR.janelas.m6.slice(0,7).split('-').map(Number);
  const [ye,me]=TR.hoje.slice(0,7).split('-').map(Number);
  while(y<ye||(y===ye&&m<=me)){out.push(y+'-'+String(m).padStart(2,'0'));m++;if(m>12){m=1;y++;}}
  return out;
}
const tile=(k,v,n,cls)=>`<div class="tile ${cls||''}"><div class="k">${k}</div><div class="v">${v}</div><div class="n">${n||''}</div></div>`;
const cobertura=(n,total)=>`${fi(n)} de ${fi(total)} chamados com SLA`;

/* ===================== visão geral ===================== */
function renderGeral(){
  const rows=rowsF(), st={}; WK.forEach(k=>st[k]=stats(rows,ini(k)));
  const a=st[S.jan];
  $('g-kpis').innerHTML=
    tile('Criados · '+WN[S.jan],fi(a.cr),WK.filter(k=>k!==S.jan).map(k=>WN[k]+': '+fi(st[k].cr)).join(' · '))+
    tile('Resolvidos · '+WN[S.jan],fi(a.rs),WK.filter(k=>k!==S.jan).map(k=>WN[k]+': '+fi(st[k].rs)).join(' · '))+
    tile('Saldo (criados − resolvidos)',(a.saldo>0?'+':'')+fi(a.saldo),a.saldo>0?'a fila cresceu na janela':'a fila diminuiu na janela',a.saldo>0?'alert':'')+
    tile('Criados e ainda abertos',fi(a.ab),fp(pct(a.ab,a.cr))+' dos criados na janela')+
    tile('1ª resposta no prazo',fp(pct(a.fok,a.fn)),cobertura(a.fn,a.cr),pct(a.fok,a.fn)<60?'alert':'');

  const lin=[['Criados',k=>st[k].cr],['Resolvidos',k=>st[k].rs],['Saldo (criados − resolvidos)',k=>st[k].saldo],
    ['Criados e ainda abertos',k=>st[k].ab],['1ª resposta no prazo',k=>fp(pct(st[k].fok,st[k].fn))],
    ['Resolução no prazo (cobertura baixa)',k=>fp(pct(st[k].qok,st[k].qn))+' <span class="pill">n='+fi(st[k].qn)+'</span>']];
  $('g-cmp').innerHTML='<thead><tr><th>Indicador</th>'+WK.map(k=>`<th style="text-align:right">${WN[k]}<br><span style="font-weight:400;text-transform:none">desde ${ini(k).split('-').reverse().join('/')}</span></th>`).join('')+'</tr></thead><tbody>'+
    lin.map(([n,f])=>`<tr><td>${n}</td>`+WK.map(k=>{const v=f(k);return `<td class="num">${typeof v==='number'?(n.startsWith('Saldo')&&v>0?'+':'')+fi(v):v}</td>`;}).join('')+'</tr>').join('')+'</tbody>';

  const C1=css('--series-1'),C2=css('--series-2');
  const ms=meses();
  const serJan=[{k:'cr',label:'Criados',color:C1,values:WK.map(k=>st[k].cr)},
    {k:'rs',label:'Resolvidos',color:C2,values:WK.map(k=>st[k].rs)}].filter(s=>serieOn(s.k));
  const serMes=[{k:'cr',label:'Criados',color:C1,values:ms.map(m=>rows.filter(r=>r.c.slice(0,7)===m&&r.c>=ini('m6')).length)},
    {k:'rs',label:'Resolvidos',color:C2,values:ms.map(m=>rows.filter(r=>r.r&&r.r.slice(0,7)===m&&r.r>=ini('m6')).length)}].filter(s=>serieOn(s.k));
  legendInto('lg-jan',serJan); legendInto('lg-mes',serMes);
  barsInto('ch-jan',WK.map(k=>WN[k]),serJan);
  barsInto('ch-mes',ms.map(mLab),serMes,{parcial:[0,ms.length-1]});

  const tipos=TR.tipos.map((n,i)=>({name:n,i})).map(t=>{
    const rs=rows.filter(r=>r.t===t.i); const s=WK.map(k=>stats(rs,ini(k)));
    const sel=stats(rs,ini(S.jan));
    return {name:t.name,value:S.med==='rs'?sel.rs:sel.cr,color:S.med==='rs'?'var(--series-2)':'var(--series-1)',
      tip:WK.map((k,j)=>`<span>${WN[k]}: ${fi(s[j].cr)} criados · ${fi(s[j].rs)} resolvidos</span>`).join('')};
  }).sort((x,y)=>y.value-x.value||x.name.localeCompare(y.name));
  hbarsInto('ch-tipo',tipos);
}

/* ===================== por responsável ===================== */
const RS={col:'cr6',dir:-1};
function respTabela(){
  const rows=rowsF(true);
  const ids=[...new Set(rows.map(r=>r.a))];
  const linhas=ids.map(a=>{
    const rs=rows.filter(r=>r.a===a), s={}; WK.forEach(k=>s[k]=stats(rs,ini(k)));
    return {a,nome:nomeResp(a),cr6:s.m6.cr,cr4:s.m4.cr,cr2:s.m2.cr,rs6:s.m6.rs,rs4:s.m4.rs,rs2:s.m2.rs,
      f6:pct(s.m6.fok,s.m6.fn),f4:pct(s.m4.fok,s.m4.fn),f2:pct(s.m2.fok,s.m2.fn),s};
  }).filter(l=>l.cr6||l.rs6);
  return linhas;
}
function renderResp(){
  const linhas=respTabela();
  const topo=(campo,col)=>{
    const l=[...linhas].sort((x,y)=>y[campo]-x[campo]||x.nome.localeCompare(y.nome));
    const top=l.slice(0,12), resto=l.slice(12);
    const rowsB=top.filter(x=>x[campo]>0).map(x=>({name:x.nome,value:x[campo],color:x.a<0?'var(--neutral)':col,
      tip:WK.map(k=>`<span>${WN[k]}: ${fi(x.s[k].cr)} criados · ${fi(x.s[k].rs)} resolvidos</span>`).join('')}));
    const outros=resto.reduce((s,x)=>s+x[campo],0);
    if(outros) rowsB.push({name:`Outros (${resto.length})`,value:outros,color:'var(--neutral)'});
    return rowsB;
  };
  const j={m6:'6',m4:'4',m2:'2'}[S.jan];
  const cCr=$('r-ch-cr').closest('.card'), cRs=$('r-ch-rs').closest('.card');
  cCr.hidden=!serieOn('cr'); cRs.hidden=!serieOn('rs');
  cCr.classList.toggle('wide',cRs.hidden); cRs.classList.toggle('wide',cCr.hidden);
  if(serieOn('cr')) hbarsInto('r-ch-cr',topo('cr'+j,css('--series-1')));
  if(serieOn('rs')) hbarsInto('r-ch-rs',topo('rs'+j,css('--series-2')));

  const cols=[['nome','Responsável',0],['cr6','Criados 6m',1],['cr4','4m',1],['cr2','2m',1],
    ['rs6','Resolvidos 6m',1],['rs4','4m',1],['rs2','2m',1],['f6','1ª resp. 6m',1],['f4','4m',1],['f2','2m',1]];
  linhas.sort((x,y)=>{const a=x[RS.col],b=y[RS.col];
    if(RS.col==='nome') return RS.dir*String(a).localeCompare(b);
    return RS.dir*((a==null?-1:a)-(b==null?-1:b))||x.nome.localeCompare(y.nome);});
  $('r-dt').innerHTML='<thead><tr>'+cols.map(c=>`<th data-s="${c[0]}"${c[2]?' style="text-align:right"':''}>${c[1]}<span class="ar">${RS.col===c[0]?(RS.dir<0?'↓':'↑'):'↕'}</span></th>`).join('')+'</tr></thead><tbody>'+
    linhas.map(l=>`<tr><td>${esc(l.nome)}</td>`+['cr6','cr4','cr2','rs6','rs4','rs2'].map(c=>`<td class="num">${fi(l[c])}</td>`).join('')+
      ['f6','f4','f2'].map(c=>`<td class="num ${l[c]!=null&&l[c]<60?'age-hi':''}">${fp(l[c])}</td>`).join('')+'</tr>').join('')+'</tbody>';
  $('r-dt').querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>{
    const c=th.dataset.s; if(RS.col===c) RS.dir*=-1; else {RS.col=c;RS.dir=c==='nome'?1:-1;} renderResp();}));
}

/* ===================== SLA ===================== */
function renderSla(){
  const rows=rowsF(), a=stats(rows,ini(S.jan));
  const estourados=a.fn-a.fok;
  $('s-kpis').innerHTML=
    tile('1ª resposta no prazo · '+WN[S.jan],fp(pct(a.fok,a.fn)),cobertura(a.fn,a.cr),pct(a.fok,a.fn)<60?'alert':'')+
    tile('1ª resposta fora do prazo',fi(estourados),'chamados criados na janela')+
    tile('Resolução no prazo · '+WN[S.jan],fp(pct(a.qok,a.qn)),cobertura(a.qn,a.cr)+' — indicativo')+
    tile('Cobertura do SLA de resolução',fp(pct(a.qn,a.cr)),'o campo não é preenchido em todos os tipos');

  const ms=meses();
  lineInto('s-ch-mes',ms.map((m,i)=>{
    const rs=rows.filter(r=>r.c.slice(0,7)===m&&r.c>=ini('m6')&&r.f>=0);
    return {cat:mLab(m),v:pct(rs.filter(r=>r.f===1).length,rs.length),n:rs.length,parcial:i===0||i===ms.length-1};
  }),css('--series-1'));

  const base=rowsF(true).filter(r=>r.c>=ini(S.jan)&&r.f>=0);
  const porR=[...new Set(base.map(r=>r.a))].map(x=>{
    const rs=base.filter(r=>r.a===x); return {name:nomeResp(x),n:rs.length,value:pct(rs.filter(r=>r.f===1).length,rs.length)};
  }).filter(x=>x.n>=10).sort((x,y)=>y.value-x.value||x.name.localeCompare(y.name));
  hbarsInto('s-ch-resp',porR.map(x=>({name:x.name,value:x.value,color:x.value<60?'var(--critical)':'var(--series-1)',
    tip:`<span>${fp(x.value)} de ${fi(x.n)} chamados</span>`})),{max:100,fmt:r=>fp(r.value)});

  const linhas=TR.tipos.map((n,i)=>{
    const s=stats(rows.filter(r=>r.t===i),ini(S.jan)); return {n,s};
  }).filter(x=>x.s.cr);
  $('s-dt-tipo').innerHTML='<thead><tr><th>Tipo</th><th style="text-align:right">Criados</th><th style="text-align:right">1ª resposta</th><th style="text-align:right">Resolução (n)</th></tr></thead><tbody>'+
    linhas.map(({n,s})=>`<tr><td>${esc(n)}</td><td class="num">${fi(s.cr)}</td><td class="num">${fp(pct(s.fok,s.fn))}</td><td class="num">${fp(pct(s.qok,s.qn))} <span class="pill">n=${fi(s.qn)}</span></td></tr>`).join('')+'</tbody>';
}

/* ===================== fila sem responsável ===================== */
const FL={col:'c',dir:1,lim:100};
function filaRows(){
  return D.filter(r=>r.a<0&&!r.d&&(S.tipo===''||r.t===+S.tipo)).map(r=>({...r,dias:diasEntre(r.c,TR.hoje),tipo:TR.tipos[r.t],status:TR.status[r.s]}));
}
const FAIXAS=[['até 7 dias',0,7],['8 a 30 dias',8,30],['31 a 90 dias',31,90],['mais de 90 dias',91,1e9]];
function renderFila(){
  const f=filaRows();
  const dias=f.map(r=>r.dias).sort((a,b)=>a-b);
  const med=dias.length?dias[Math.floor(dias.length/2)]:0;
  $('f-kpis').innerHTML=
    tile('Na fila sem responsável',fi(f.length),'abertos, sem atribuição',f.length?'alert':'')+
    tile('Mais antigo',(dias.length?dias[dias.length-1]:0)+' <small>dias</small>','desde a abertura')+
    tile('Mediana de idade',med+' <small>dias</small>','central superior')+
    tile('Com mais de 30 dias',fp(pct(f.filter(r=>r.dias>30).length,f.length)),fi(f.filter(r=>r.dias>30).length)+' chamados');
  const ordC=['--ord-1','--ord-2','--ord-3','--ord-4','--ord-5'];
  hbarsInto('f-ch-age',FAIXAS.map((x,i)=>({name:x[0],value:f.filter(r=>r.dias>=x[1]&&r.dias<=x[2]).length,color:`var(${ordC[i+1]})`})));

  const cols=[['k','Chave'],['tipo','Tipo'],['status','Status'],['c','Criado'],['dias','Dias'],['f','1ª resposta']];
  f.sort((a,b)=>{const x=a[FL.col],y=b[FL.col]; return FL.dir*(typeof x==='string'?x.localeCompare(y):x-y)||a.k.localeCompare(b.k);});
  $('f-dt').innerHTML='<thead><tr>'+cols.map(c=>`<th data-s="${c[0]}">${c[1]}<span class="ar">${FL.col===c[0]?(FL.dir<0?'↓':'↑'):'↕'}</span></th>`).join('')+'</tr></thead><tbody>'+
    f.slice(0,FL.lim).map(r=>`<tr><td><a href="${JIRA}${esc(r.k)}" target="_blank" rel="noopener">${esc(r.k)}</a></td><td>${esc(r.tipo)}</td><td>${esc(r.status)}</td>`+
      `<td>${r.c.split('-').reverse().join('/')}</td><td class="num ${r.dias>30?'age-hi':''}">${r.dias}</td><td>${r.f===1?'no prazo':r.f===0?'<span class="age-hi">estourou</span>':'–'}</td></tr>`).join('')+'</tbody>';
  $('f-count').textContent=`Mostrando ${Math.min(FL.lim,f.length)} de ${fi(f.length)}`;
  $('f-more').hidden=FL.lim>=f.length;
  $('f-dt').querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>{
    const c=th.dataset.s; if(FL.col===c) FL.dir*=-1; else {FL.col=c;FL.dir=1;} renderFila();}));
}
$('f-more').addEventListener('click',()=>{FL.lim+=100;renderFila();});
$('f-csv').addEventListener('click',()=>{
  const f=filaRows().sort((a,b)=>a.c.localeCompare(b.c));
  const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
  const csv='﻿chave;tipo;status;criado;dias\n'+f.map(r=>[r.k,r.tipo,r.status,r.c,r.dias].map(q).join(';')).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.download='trend_fila_sem_responsavel.csv'; a.click(); URL.revokeObjectURL(a.href);
});

/* ===================== orquestração ===================== */
const VIEWS={geral:{tab:'tab-geral',view:'view-geral',r:renderGeral},resp:{tab:'tab-resp',view:'view-resp',r:renderResp},
  sla:{tab:'tab-sla',view:'view-sla',r:renderSla},fila:{tab:'tab-fila',view:'view-fila',r:renderFila}};
let cur='geral';
function show(v){
  cur=v;
  for(const k in VIEWS){ $(VIEWS[k].view).hidden=k!==v; $(VIEWS[k].tab).setAttribute('aria-selected',String(k===v)); }
  VIEWS[v].r(); hideTip(); scrollTo({top:0,behavior:'instant'});
}
for(const k in VIEWS) $(VIEWS[k].tab).addEventListener('click',()=>show(k));

TR.tipos.forEach((n,i)=>$('fTipo').insertAdjacentHTML('beforeend',`<option value="${i}">${esc(n)}</option>`));
$('fResp').insertAdjacentHTML('beforeend','<option value="-1">(sem responsável)</option>');
TR.resp.map((n,i)=>({n,i})).sort((a,b)=>a.n.localeCompare(b.n)).forEach(x=>$('fResp').insertAdjacentHTML('beforeend',`<option value="${x.i}">${esc(x.n)}</option>`));
$('fTipo').addEventListener('change',e=>{S.tipo=e.target.value;FL.lim=100;VIEWS[cur].r();});
$('fResp').addEventListener('change',e=>{S.resp=e.target.value;VIEWS[cur].r();});
$('fJanela').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
  S.jan=b.dataset.j; $('fJanela').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); VIEWS[cur].r();}));
$('fMedida').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
  S.med=b.dataset.m; $('fMedida').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); VIEWS[cur].r();}));
$('clear').addEventListener('click',()=>{
  S.tipo='';S.resp='';S.jan='m6';S.med='ambos';$('fTipo').value='';$('fResp').value='';
  $('fMedida').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.m==='ambos')));
  $('fJanela').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.j==='m6')));
  VIEWS[cur].r();});
$('themeBtn').addEventListener('click',()=>{
  const c=document.documentElement.getAttribute('data-theme');
  const dark=c?c==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme',dark?'light':'dark'); VIEWS[cur].r();
});

$('chipGer').textContent='Extraído do Jira em '+TR.geradoEm;
$('foot').innerHTML=
  'Fonte: Jira Cloud CVC Corp &middot; '+TR.filtros.map(f=>`filtro <code>${f.id}</code> (${esc(f.nome)})`).join(', ')+
  ', sem as cláusulas de status e de responsável (aqueles filtros são filas de chamados sem responsável).<br>'+
  '<b>Janelas</b> terminam em '+TR.hoje.split('-').reverse().join('/')+': 6 meses desde '+ini('m6').split('-').reverse().join('/')+
  ', 4 meses desde '+ini('m4').split('-').reverse().join('/')+', 2 meses desde '+ini('m2').split('-').reverse().join('/')+'.<br>'+
  '<b>Criados</b> usa a data de criação; <b>resolvidos</b> usa a data de resolução, inclusive de chamados criados antes da janela. '+
  '<b>Responsável</b> é o atual do chamado, não quem o atendeu na época.<br>'+
  '<b>SLA:</b> 1ª resposta vem do campo <i>Tempo até a primeira resposta</i>; resolução vem de <i>Time to resolution</i>, '+
  'preenchido apenas em parte dos chamados — leia como indicativo. O SLA é medido sobre os chamados <b>criados</b> na janela.';
show('geral');
addEventListener('resize',()=>{clearTimeout(window.__r);window.__r=setTimeout(()=>VIEWS[cur].r(),180);});
