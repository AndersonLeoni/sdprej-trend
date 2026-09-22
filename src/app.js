/* ===================== shared helpers ===================== */
const nfInt=new Intl.NumberFormat('pt-BR');
const nf1=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const nfBRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const nfBRL2=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shortN=v=>v>=1e6?(v/1e6).toFixed(2).replace('.',',')+' mi':v>=1e3?Math.round(v/1e3)+' mil':nfInt.format(Math.round(v));
const MN=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const mLab=m=>{const[y,mm]=m.split('-');return MN[+mm-1]+'/'+y.slice(2);};
const mFull=m=>{const[y,mm]=m.split('-');return MN[+mm-1]+'/'+y;};
const SEQ=['--seq-100','--seq-200','--seq-300','--seq-400','--seq-500','--seq-600','--seq-700'];
const ORD=['--ord-1','--ord-2','--ord-3','--ord-4','--ord-5'];
const JIRA='https://cvccorp.atlassian.net/browse/';
const NS='http://www.w3.org/2000/svg';
const mk=(t,a)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e;};

const tip=document.getElementById('tip');
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
function legendInto(id,defs,line){
  document.getElementById(id).innerHTML=defs.map(d=>
    `<span><i class="${line?'ln':''}" style="background:${d.color}"></i>${esc(d.label)}</span>`).join('');
}
function hbarsInto(mountId,rows,opt){
  opt=opt||{};
  const el=document.getElementById(mountId); el.innerHTML='';
  if(!rows.length){ el.innerHTML='<div class="empty">Sem dados no recorte atual.</div>'; return; }
  const max=Math.max(...rows.map(r=>r.value),1);
  rows.forEach((r,i)=>{
    const row=document.createElement('div'); row.className='hrow';
    const color=r.color||(opt.ordinal?`var(${ORD[Math.min(i,4)]})`:'var(--series-1)');
    row.innerHTML=`<div class="hlab" title="${esc(r.name)}">${esc(r.name)}</div>`+
      `<div class="htrack"><div class="hfill" style="width:${(r.value/max*100).toFixed(2)}%;background:${color}"></div></div>`+
      `<div class="hval">${opt.fmt?opt.fmt(r):nfInt.format(r.value)}</div>`;
    bindTip(row,`<b>${esc(r.name)}</b>${r.tip||`<span>${nfInt.format(r.value)}</span>`}`);
    el.appendChild(row);
  });
}
/* grouped / single vertical bars */
function barsInto(mountId,cats,series,opt){
  opt=opt||{};
  const el=document.getElementById(mountId); el.innerHTML='';
  if(!cats.length||!series.length){ el.innerHTML='<div class="empty">Sem dados no recorte atual.</div>'; return; }
  const W=1000,H=opt.h||260,mL=48,mR=10,mT=22,mB=opt.mB||48;
  const pw=W-mL-mR, ph=H-mT-mB;
  let max=0; cats.forEach((c,i)=>series.forEach(s=>{if(s.values[i]>max)max=s.values[i];}));
  max=max||1;
  const step=pw/cats.length, n=series.length;
  const gw=Math.min(step-8,n>1?150:88), bw=Math.max(2,(gw-2*(n-1))/n);
  const svg=mk('svg',{viewBox:`0 0 ${W} ${H}`,role:'img',preserveAspectRatio:'none'});
  svg.style.height=H+'px';
  for(let t=0;t<=4;t++){
    const y=mT+ph-(ph*t/4);
    svg.appendChild(mk('line',{x1:mL,x2:mL+pw,y1:y,y2:y,class:'gl'}));
    const lb=mk('text',{x:mL-8,y:y+3.5,class:'tk','text-anchor':'end'});
    lb.textContent=opt.fmtY?opt.fmtY(max*t/4):nfInt.format(Math.round(max*t/4));
    svg.appendChild(lb);
  }
  svg.appendChild(mk('line',{x1:mL,x2:mL+pw,y1:mT+ph,y2:mT+ph,class:'axl'}));
  const every=opt.every||1;
  cats.forEach((c,i)=>{
    const gx=mL+i*step+(step-gw)/2;
    const g=mk('g',{});
    g.appendChild(mk('rect',{x:mL+i*step,y:mT,width:step,height:ph,fill:'transparent'}));
    bindTip(g,`<b>${esc(opt.catLabel?opt.catLabel(c):c)}</b>`+series.map(s=>
      `<span>${n>1?`<i style="background:${s.color}"></i>${esc(s.label)}: `:''}`+
      `${opt.fmtV?opt.fmtV(s.values[i]):nfInt.format(s.values[i])}</span>`).join(''));
    svg.appendChild(g);
    series.forEach((s,j)=>{
      const v=s.values[i]; if(!v) return;
      const h=Math.max(2,v/max*ph), x=gx+j*(bw+2), y=mT+ph-h;
      const rad=Math.min(4,h/2,bw/2);
      const color=s.color||(opt.ordinal?`var(${ORD[Math.min(i,4)]})`:'var(--series-1)');
      svg.appendChild(mk('path',{fill:color,d:
        `M${x},${mT+ph} L${x},${y+rad} Q${x},${y} ${x+rad},${y} L${x+bw-rad},${y} Q${x+bw},${y} ${x+bw},${y+rad} L${x+bw},${mT+ph} Z`}));
      const peak = opt.labelMode==='global' ? (v===max) : (v===Math.max(...s.values));
      if(peak&&v>0){
        const dl=mk('text',{x:x+bw/2,y:y-6,class:'dlab','text-anchor':'middle'});
        dl.textContent=opt.fmtV?opt.fmtV(v):nfInt.format(v); svg.appendChild(dl);
      }
    });
    if(i%every===0||i===cats.length-1){
      const tx=mL+i*step+step/2;
      const lb=mk('text',{x:tx,y:mT+ph+16,class:'tk',
        'text-anchor':opt.rotate?'end':'middle'});
      lb.textContent=opt.catLabel?opt.catLabel(c):c;
      if(opt.rotate) lb.setAttribute('transform',`rotate(-38 ${tx} ${mT+ph+16})`);
      svg.appendChild(lb);
    }
  });
  el.appendChild(svg);
}

/* ===================== VIEW: TEMAS ===================== */
const ViewTemas=(function(){
  const I=DT.issues;
  const AG=['0-90 dias','91-180 dias','181-365 dias','366-540 dias','541+ dias'];
  let metric='count', sortKey='valor', sortDir=-1, shown=100;
  I.forEach(i=>{
    i.valor=+i.valor||0; i.diasAberto=+i.diasAberto||0;
    i.aging = i.diasAberto<=90?AG[0] : i.diasAberto<=180?AG[1]
            : i.diasAberto<=365?AG[2] : i.diasAberto<=540?AG[3] : AG[4];
  });
  const uniq=k=>[...new Set(I.map(x=>x[k]||'Não informado'))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  function fill(id,vals){
    const s=document.getElementById(id);
    vals.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;s.appendChild(o);});
  }
  fill('fTema',uniq('temaDerivado')); fill('fArea',uniq('areaFalha')); fill('fAging',AG);

  function current(){
    const t=document.getElementById('fTema').value, a=document.getElementById('fArea').value,
          g=document.getElementById('fAging').value,
          gd=document.getElementById('fGdis').value,
          q=document.getElementById('fBusca').value.trim().toLowerCase();
    return I.filter(i=>{
      if(t&&(i.temaDerivado||'Não informado')!==t) return false;
      if(a&&(i.areaFalha||'Não informado')!==a) return false;
      if(g&&i.aging!==g) return false;
      if(gd&&i.gcls!==gd) return false;
      if(q){
        const hay=[i.key,i.summary,i.fornecedor,i.cliente,i.ocorrencia,i.temaDerivado,i.areaFalha,i.gcls,i.gstat]
          .filter(Boolean).join(' ').toLowerCase();
        if(!hay.includes(q)) return false;
      }
      return true;
    });
  }
  function agg(rows,key,topN,order){
    const m=new Map();
    rows.forEach(r=>{
      const k=r[key]||'Não informado';
      const e=m.get(k)||{name:k,count:0,valor:0};
      e.count++; e.valor+=r.valor; m.set(k,e);
    });
    let arr=[...m.values()];
    if(order) arr.sort((a,b)=>order.indexOf(a.name)-order.indexOf(b.name));
    else arr.sort((a,b)=>b[metric]-a[metric]);
    if(topN&&arr.length>topN&&!order){
      const head=arr.slice(0,topN), tail=arr.slice(topN);
      head.push({name:`Outros (${tail.length})`,count:tail.reduce((s,x)=>s+x.count,0),
                 valor:tail.reduce((s,x)=>s+x.valor,0),isOther:true});
      arr=head;
    }
    return arr;
  }
  const toRows=(a,total)=>a.map(r=>({name:r.name,value:r[metric],
    tip:`<span>${nfInt.format(r.count)} chamado(s) · ${total?(r.count/total*100).toFixed(1):0}% do recorte</span>`+
        `<span>R$ ${nfBRL2.format(r.valor)}</span>`+
        `<span>Ticket médio: R$ ${nfBRL2.format(r.count?r.valor/r.count:0)}</span>`,isOther:r.isOther}));
  const fmtBar=r=>metric==='count'?nfInt.format(r.value):nfBRL.format(r.value);

  function heat(rows){
    const el=document.getElementById('ch-heat');
    if(!rows.length){ el.innerHTML='<div class="empty">Nenhum chamado no recorte atual.</div>'; return; }
    const OT='Outros temas', OA='Outras áreas';
    const allT=agg(rows,'temaDerivado',null).sort((a,b)=>b.count-a.count).map(r=>r.name);
    const allA=agg(rows,'areaFalha',null).sort((a,b)=>b.count-a.count).map(r=>r.name);
    const temas=allT.slice(0,6), areas=allA.slice(0,5);
    const rowKeys=allT.length>temas.length?temas.concat(OT):temas;
    const colKeys=allA.length>areas.length?areas.concat(OA):areas;
    const cell={};
    rows.forEach(r=>{
      const t0=r.temaDerivado||'Não informado', a0=r.areaFalha||'Não informado';
      const t=temas.includes(t0)?t0:OT, a=areas.includes(a0)?a0:OA;
      cell[t+'||'+a]=(cell[t+'||'+a]||0)+1;
    });
    const prim=[]; temas.forEach(t=>areas.forEach(a=>{const v=cell[t+'||'+a];if(v)prim.push(v);}));
    const max=Math.max(...prim,1);
    const roll=(t,a)=>t===OT||a===OA;
    const shortA=a=>{const s=a.replace(/\s*-\s*(prejuízo|Prejuízo)\s*$/,'').trim();
      return s.length>19?s.slice(0,18)+'…':s;};
    const colTot={}; let h='<table class="hm"><thead><tr><th></th>';
    colKeys.forEach(a=>h+=`<th class="rot" title="${esc(a)}">${esc(shortA(a))}</th>`);
    h+='<th style="text-align:right">Total</th></tr></thead><tbody>';
    rowKeys.forEach(t=>{
      h+=`<tr><td class="rl" title="${esc(t)}">${esc(t)}</td>`; let rt=0;
      colKeys.forEach(a=>{
        const v=cell[t+'||'+a]||0; rt+=v; colTot[a]=(colTot[a]||0)+v;
        if(!v){ h+='<td class="z">·</td>'; return; }
        if(roll(t,a)){ h+=`<td style="color:var(--text-secondary)" title="${esc(t)} × ${esc(a)}: ${v}">${v}</td>`; return; }
        const si=Math.min(6,Math.floor(v/max*6.999));
        h+=`<td style="background:var(${SEQ[si]});color:var(--on-seq-${si+1})" title="${esc(t)} × ${esc(a)}: ${v} chamado(s)">${v}</td>`;
      });
      h+=`<td style="text-align:right;color:var(--text-secondary)">${rt}</td></tr>`;
    });
    h+=`<tr><td class="rl" style="color:var(--muted);font-size:10.5px;text-transform:uppercase;letter-spacing:.03em">Total</td>`;
    colKeys.forEach(a=>h+=`<td style="color:var(--text-secondary)">${colTot[a]||0}</td>`);
    h+=`<td style="text-align:right;font-weight:700">${rows.length}</td></tr></tbody></table>`;
    h+=`<div class="hm-legend"><span>menor</span>`+SEQ.map(s=>`<i style="background:var(${s})"></i>`).join('')+
       `<span>maior &middot; até ${max} chamados por célula</span>`+
       `<span style="margin-left:6px">Totais fecham em ${nfInt.format(rows.length)}.</span></div>`;
    el.innerHTML=h;
  }

  function table(rows){
    const sorted=[...rows].sort((a,b)=>{
      let x=a[sortKey],y=b[sortKey];
      if(sortKey==='valor'||sortKey==='diasAberto') return ((+x||0)-(+y||0))*sortDir;
      return String(x||'').localeCompare(String(y||''),'pt-BR')*sortDir;
    });
    const sl=sorted.slice(0,shown);
    document.querySelector('#t-dt tbody').innerHTML=sl.map(r=>{
      const occ=r.ocorrencia&&/^[A-Z]+-\d+$/.test(r.ocorrencia)
        ? `<a href="${JIRA}${esc(r.ocorrencia)}" target="_blank" rel="noopener">${esc(r.ocorrencia)}</a>`
        : `<span style="color:var(--muted)">${esc(r.ocorrencia||'—')}</span>`;
      return `<tr>
        <td><a href="${JIRA}${esc(r.key)}" target="_blank" rel="noopener">${esc(r.key)}</a></td>
        <td class="sum" title="${esc(r.summary)}">${esc(r.summary)}</td>
        <td><span class="pill">${esc(r.temaDerivado)}</span></td>
        <td style="color:var(--text-secondary)">${esc((r.areaFalha||'').replace(/\s*-\s*(prejuízo|Prejuízo)\s*$/,''))}</td>
        <td class="sum" title="${esc(r.fornecedor||'')}">${esc(r.fornecedor||'—')}</td>
        <td class="num" style="color:var(--text-secondary)">${esc(r.created)}</td>
        <td class="num ${r.diasAberto>365?'age-hi':''}">${nfInt.format(r.diasAberto)}</td>
        <td class="num" style="font-weight:620">${nfBRL2.format(r.valor)}</td>
        <td>${occ}</td>
        <td>${gdisPill(r.key)}</td></tr>`;
    }).join('');
    document.getElementById('t-count').textContent=
      `Exibindo ${nfInt.format(sl.length)} de ${nfInt.format(rows.length)} chamados · soma do recorte R$ ${nfBRL2.format(rows.reduce((s,r)=>s+r.valor,0))}`;
    document.getElementById('t-more').style.display=sl.length<rows.length?'':'none';
    document.querySelectorAll('#t-dt th').forEach(th=>{
      const a=th.querySelector('.ar');
      a.textContent=th.dataset.s===sortKey?(sortDir>0?'▲':'▼'):'↕';
      a.style.opacity=th.dataset.s===sortKey?1:.45;
    });
  }

  function kpis(rows){
    const tot=rows.length, val=rows.reduce((s,r)=>s+r.valor,0);
    const old=rows.filter(r=>r.diasAberto>180).length;
    const avg=tot?Math.round(rows.reduce((s,r)=>s+r.diasAberto,0)/tot):0;
    const vs=rows.map(r=>r.valor).sort((a,b)=>a-b);
    const med=tot?vs[Math.floor(tot/2)]:0, mx=tot?vs[vs.length-1]:0;
    document.getElementById('t-kpis').innerHTML=`
      <div class="tile"><div class="k">Chamados no recorte</div><div class="v">${nfInt.format(tot)}</div>
        <div class="n">aguardando parecer da TI</div></div>
      <div class="tile"><div class="k">Prejuízo reclamado</div><div class="v">${nfBRL.format(val)}</div>
        <div class="n">soma de Prejuízo após Reversão</div></div>
      <div class="tile alert"><div class="k">Acima de 180 dias</div><div class="v">${nfInt.format(old)}</div>
        <div class="n">${tot?(old/tot*100).toFixed(0):0}% do recorte · risco de prescrição de análise</div></div>
      <div class="tile"><div class="k">Idade média</div><div class="v">${nfInt.format(avg)}<small> dias</small></div>
        <div class="n">desde a abertura do SDPREJ</div></div>
      <div class="tile"><div class="k">Valor mediano</div><div class="v">${nfBRL.format(med)}</div>
        <div class="n">metade dos casos vale menos que isso</div></div>
      <div class="tile"><div class="k">Maior caso</div><div class="v">${nfBRL.format(mx)}</div>
        <div class="n">maior prejuízo individual do recorte</div></div>`;
  }

  function render(){
    const rows=current();
    kpis(rows);
    const t=agg(rows,'temaDerivado',8);
    hbarsInto('ch-tema',toRows(t,rows.length),{fmt:fmtBar});
    const lead=t.filter(r=>!r.isOther)[0];
    document.getElementById('cs-tema').innerHTML=lead
      ? `Derivado do padrão do resumo. Liderança: <b>${esc(lead.name)}</b> com ${nfInt.format(lead.count)} chamados (${(lead.count/rows.length*100).toFixed(0)}%) e R$ ${nfBRL2.format(lead.valor)}.`
      : 'Derivado do padrão do resumo do chamado.';
    hbarsInto('ch-falha',toRows(agg(rows,'falha',6),rows.length),{fmt:fmtBar});
    hbarsInto('ch-area',toRows(agg(rows,'areaFalha',8),rows.length),{fmt:fmtBar});
    hbarsInto('ch-forn',toRows(agg(rows,'fornecedor',12),rows.length),{fmt:fmtBar});
    hbarsInto('ch-cli',toRows(agg(rows,'cliente',12),rows.length),{fmt:fmtBar});

    const ag=agg(rows,'aging',null,AG);
    barsInto('ch-aging',AG,[{label:'Chamados',values:ag.map(r=>r[metric])}],
      {ordinal:true,rotate:true,mB:56,h:250,catLabel:c=>c.replace(' dias',''),
       fmtY:v=>metric==='valor'?shortN(v):nfInt.format(Math.round(v)),
       fmtV:v=>metric==='valor'?shortN(v):nfInt.format(v)});

    const byM=new Map();
    rows.forEach(r=>{const k=r.created.slice(0,7);
      const e=byM.get(k)||{name:k,count:0,valor:0};e.count++;e.valor+=r.valor;byM.set(k,e);});
    let months=[];
    if(byM.size){
      const ks=[...byM.keys()].sort();
      let [y,m]=ks[0].split('-').map(Number);
      const [ey,em]=ks[ks.length-1].split('-').map(Number);
      while(y<ey||(y===ey&&m<=em)){
        const k=`${y}-${String(m).padStart(2,'0')}`;
        months.push(byM.get(k)||{name:k,count:0,valor:0});
        m++; if(m>12){m=1;y++;}
      }
    }
    const ev=Math.max(1,Math.ceil(months.length/12));
    barsInto('ch-mesq',months.map(r=>r.name),[{label:'Chamados',values:months.map(r=>r.count)}],
      {rotate:true,every:ev,mB:52,catLabel:mLab,labelMode:'series'});
    barsInto('ch-mesv',months.map(r=>r.name),[{label:'Valor',values:months.map(r=>r.valor)}],
      {rotate:true,every:ev,mB:52,catLabel:mLab,fmtY:shortN,fmtV:shortN});

    heat(rows); table(rows);
  }

  ['fTema','fArea','fAging','fGdis'].forEach(id=>document.getElementById(id)
    .addEventListener('change',()=>{shown=100;render();}));
  let deb; document.getElementById('fBusca').addEventListener('input',()=>{
    clearTimeout(deb); deb=setTimeout(()=>{shown=100;render();},180);});
  document.getElementById('t-clear').addEventListener('click',()=>{
    ['fTema','fArea','fAging','fGdis'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('fBusca').value=''; shown=100; render();});
  document.getElementById('segMetric').addEventListener('click',e=>{
    const b=e.target.closest('button[data-m]'); if(!b) return;
    metric=b.dataset.m;
    [...e.currentTarget.querySelectorAll('button')].forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    render();});
  document.querySelectorAll('#t-dt th').forEach(th=>th.addEventListener('click',()=>{
    const k=th.dataset.s;
    if(k===sortKey) sortDir*=-1; else {sortKey=k; sortDir=(k==='valor'||k==='diasAberto')?-1:1;}
    render();}));
  document.getElementById('t-more').addEventListener('click',()=>{shown+=100;render();});
  document.getElementById('t-csv').addEventListener('click',()=>{
    const rows=current();
    const cols=['key','summary','temaDerivado','areaFalha','falha','fornecedor','cliente','created','diasAberto','valor','ocorrencia','gkey','gstat','gcls'];
    const head=['Chave','Resumo','Tema','Area identificadora','Falha','Fornecedor/Hotel','Cliente','Criado','Dias aberto','Valor R$','Ocorrencia','GDIS','Status do GDIS','Situacao do GDIS'];
    const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
    const csv='﻿'+[head.join(';'),...rows.map(r=>cols.map(c=>q(c==='valor'?String(r[c]).replace('.',','):r[c])).join(';'))].join('\r\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    a.download='sdprej-temas-'+new Date().toISOString().slice(0,10)+'.csv'; a.click();});

  return {render};
})();

/* ===================== VIEW: ANALISTAS ===================== */
const ViewAna=(function(){
  /* Os analistas em destaque vêm do DADO (DA.foco), não do código.
     Nome de pessoa com métrica individual de produtividade é dado pessoal
     sujeito à LGPD: escrito aqui, ele iria para o repositório e ficaria no
     histórico do Git para sempre. Vindo do payload, fica em data/, que é
     ignorado. O código funciona com zero, um, dois ou N em foco. */
  const FOCO=(DA.foco||[]).map((f,i)=>({
    nome:f.nome, curto:f.curto||f.nome, color:`var(--series-${i+1})`
  }));
  const FMAP=new Map(FOCO.map(f=>[f.nome,f]));
  const SHORT=n=>(FMAP.get(n)||{}).curto||n;
  const COLOR=n=>(FMAP.get(n)||{}).color||'var(--neutral)';
  const FQ=['0-30 dias','31-90 dias','91-180 dias','181-365 dias','365+ dias'];
  let sortKey='diasNaFila', sortDir=-1, shown=100;

  DA.ciclos.forEach(c=>{c.valor=+c.valor||0;});
  DA.fila.forEach(f=>{
    f.valor=+f.valor||0; f.diasNaFila=+f.diasNaFila||0;
    f.faixa=f.diasNaFila<=30?FQ[0]:f.diasNaFila<=90?FQ[1]
           :f.diasNaFila<=180?FQ[2]:f.diasNaFila<=365?FQ[3]:FQ[4];
  });
  const MONTHS=[...new Set([...DA.ciclos.map(c=>c.mes),...DA.areas.map(a=>a.mes),
    ...DA.fila.map(f=>f.mesEnvio)].filter(Boolean))].sort();
  const key=n=>FMAP.has(n)?n:'__outros';
  /* preenche o seletor a partir do foco, em vez de opção fixa na marcação */
  (function preencheSeletor(){
    const sel=document.getElementById('fAnalista');
    FOCO.forEach(f=>{
      const o=document.createElement('option');
      o.value=f.nome; o.textContent=f.curto; sel.appendChild(o);
    });
    const o=document.createElement('option');
    o.value='__outros'; o.textContent=FOCO.length?'Demais analistas':'Todos os analistas';
    sel.appendChild(o);
  })();
  function cutoff(){
    const v=document.getElementById('fPeriodo').value;
    return v?(MONTHS.slice(-parseInt(v,10))[0]||null):null;
  }
  function anaMatch(n){
    const v=document.getElementById('fAnalista').value;
    if(!v) return true;
    if(v==='__outros') return !FMAP.has(n);
    return n===v;
  }
  function scoped(){
    const cut=cutoff(), ok=m=>!cut||(m&&m>=cut);
    return {
      ciclos:DA.ciclos.filter(c=>anaMatch(c.analista)&&ok(c.mes)),
      areas:DA.areas.filter(a=>anaMatch(a.autor)&&ok(a.mes)),
      fila:DA.fila.filter(f=>anaMatch(f.enviadoPor)&&ok(f.mesEnvio)),
      months:MONTHS.filter(ok)
    };
  }
  function activeSeries(){
    const v=document.getElementById('fAnalista').value, out=[];
    FOCO.forEach(f=>{ if(!v||v===f.nome) out.push({k:f.nome,label:f.curto,color:f.color}); });
    if(!v||v==='__outros') out.push({k:'__outros',
      label:FOCO.length?'Demais analistas':'Todos os analistas',color:COLOR('__outros')});
    return out;
  }

  function lines(mountId,cats,series){
    const el=document.getElementById(mountId); el.innerHTML='';
    if(!cats.length||!series.length){ el.innerHTML='<div class="empty">Sem dados no recorte atual.</div>'; return; }
    const W=1000,H=300,mL=46,mR=46,mT=22,mB=44;
    const pw=W-mL-mR, ph=H-mT-mB;
    let max=0; series.forEach(s=>s.values.forEach(v=>{if(v>max)max=v;})); max=max||1;
    const n=cats.length;
    const X=i=>n===1?mL+pw/2:mL+(pw*i/(n-1));
    const Y=v=>mT+ph-(v/max*ph);
    const svg=mk('svg',{viewBox:`0 0 ${W} ${H}`,role:'img',preserveAspectRatio:'none'});
    svg.style.height='300px';
    for(let t=0;t<=4;t++){
      const y=mT+ph-(ph*t/4);
      svg.appendChild(mk('line',{x1:mL,x2:mL+pw,y1:y,y2:y,class:'gl'}));
      const lb=mk('text',{x:mL-8,y:y+3.5,class:'tk','text-anchor':'end'});
      lb.textContent=nfInt.format(Math.round(max*t/4)); svg.appendChild(lb);
    }
    svg.appendChild(mk('line',{x1:mL,x2:mL+pw,y1:mT+ph,y2:mT+ph,class:'axl'}));
    const every=Math.max(1,Math.ceil(n/14));
    cats.forEach((c,i)=>{
      if(i%every!==0&&i!==n-1) return;
      const lb=mk('text',{x:X(i),y:mT+ph+16,class:'tk','text-anchor':'end',
        transform:`rotate(-38 ${X(i)} ${mT+ph+16})`});
      lb.textContent=mLab(c); svg.appendChild(lb);
    });
    const cross=mk('line',{x1:0,x2:0,y1:mT,y2:mT+ph,class:'xh',opacity:0});
    svg.appendChild(cross);
    series.forEach(s=>{
      const d=s.values.map((v,i)=>`${i?'L':'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
      svg.appendChild(mk('path',{d,fill:'none',stroke:s.color,'stroke-width':2,
        'stroke-linejoin':'round','stroke-linecap':'round'}));
      s.values.forEach((v,i)=>{ if(!v) return;
        svg.appendChild(mk('circle',{cx:X(i),cy:Y(v),r:4,fill:s.color,
          stroke:'var(--surface-1)','stroke-width':2}));});
    });
    const li=cats.length-1;
    const ends=series.map(s=>({v:s.values[li],color:s.color,y:Y(s.values[li])})).sort((a,b)=>a.y-b.y);
    for(let i=1;i<ends.length;i++) if(ends[i].y-ends[i-1].y<13) ends[i].y=ends[i-1].y+13;
    const ov=ends.length?ends[ends.length-1].y-(mT+ph):0;
    if(ov>0) ends.forEach(e=>e.y-=ov);
    ends.forEach(e=>{
      const lb=mk('text',{x:X(li)+9,y:e.y+4,class:'dlab',fill:e.color});
      lb.textContent=nfInt.format(e.v); svg.appendChild(lb);});
    const hit=mk('rect',{x:mL,y:mT,width:pw,height:ph,fill:'transparent'});
    svg.appendChild(hit);
    hit.addEventListener('mousemove',e=>{
      const r=svg.getBoundingClientRect();
      const rel=(e.clientX-r.left)/r.width*W;
      let i=Math.round((rel-mL)/(pw/Math.max(n-1,1)));
      i=Math.max(0,Math.min(n-1,i));
      cross.setAttribute('x1',X(i)); cross.setAttribute('x2',X(i)); cross.setAttribute('opacity',1);
      showTip(e,`<b>${esc(mFull(cats[i]))}</b>`+series.map(s=>
        `<span><i style="background:${s.color}"></i>${esc(s.label)}: ${nfInt.format(s.values[i])} ciclos</span>`).join(''));
    });
    hit.addEventListener('mouseleave',()=>{cross.setAttribute('opacity',0);hideTip();});
    el.appendChild(svg);
  }

  function timeline(s){
    const el=document.getElementById('ch-timeline');
    const defs=activeSeries(), months=s.months;
    if(!months.length){ el.innerHTML='<div class="empty">Sem dados no recorte atual.</div>'; return; }
    const per={}; let max=0;
    defs.forEach(d=>{
      per[d.k]=months.map(m=>s.ciclos.filter(c=>c.mes===m&&key(c.analista)===d.k).length);
      per[d.k].forEach(v=>{if(v>max)max=v;});
    });
    max=max||1;
    let h='<div class="tl">';
    defs.forEach(d=>{
      const vals=per[d.k], tot=vals.reduce((a,b)=>a+b,0), act=vals.filter(v=>v>0).length;
      h+=`<div class="tlrow"><div class="tlname"><i style="background:${d.color}"></i>${esc(d.label)}</div><div class="tlcells">`;
      vals.forEach((v,i)=>{
        if(!v){ h+=`<div class="tlc" title="${esc(mFull(months[i]))}: sem ciclos"></div>`; return; }
        const si=Math.min(6,Math.floor(v/max*6.999));
        h+=`<div class="tlc" style="background:var(${SEQ[si]})" title="${esc(mFull(months[i]))}: ${v} ciclos"></div>`;
      });
      h+=`</div><div class="tlsum">${nfInt.format(tot)} em ${act} ${act===1?'mês':'meses'}</div></div>`;
    });
    h+='</div>';
    h+=`<div class="tlaxis"><div></div><div class="tlticks"><span>${esc(mLab(months[0]))}</span>`+
       (months.length>2?`<span>${esc(mLab(months[Math.floor(months.length/2)]))}</span>`:'')+
       `<span>${esc(mLab(months[months.length-1]))}</span></div><div style="min-width:96px"></div></div>`;
    h+=`<div class="tlleg"><span>menos</span>`+SEQ.map(k=>`<i style="background:var(${k})"></i>`).join('')+
       `<span>mais · até ${nfInt.format(max)} ciclos no mês</span></div>`;
    el.innerHTML=h;
  }

  function ritmo(s){
    const el=document.getElementById('ch-ritmo');
    const defs=activeSeries();
    const rows=defs.map(d=>{
      const c=s.ciclos.filter(x=>key(x.analista)===d.k);
      const act=new Set(c.map(x=>x.mes)).size;
      return {label:d.label,color:d.color,total:c.length,ativos:act,rate:act?c.length/act:0};
    });
    if(!rows.some(r=>r.total)){ el.innerHTML='<div class="empty">Sem dados no recorte atual.</div>'; return; }
    const max=Math.max(...rows.map(r=>r.rate),1);
    let h='';
    rows.forEach(r=>{
      h+=`<div class="cmprow"><div class="cmpname"><i style="background:${r.color}"></i>${esc(r.label)}</div>`+
         `<div class="cmpbar"><div class="cmpfill" style="width:${(r.rate/max*100).toFixed(1)}%;background:${r.color}"></div>`+
         `<div class="cmpv">${nf1.format(r.rate)} /mês</div></div></div>`;
    });
    /* A leitura comparativa só faz sentido com exatamente dois em foco; com
       outro número, cai na listagem simples logo abaixo. */
    const dois=FOCO.length===2?FOCO.map(f=>rows.find(r=>r.label===f.curto)):[];
    const [a,b]=dois;
    let nota;
    if(a&&b&&a.total&&b.total){
      const lider=a.rate>b.rate?a:b;
      nota=`No recorte, <b>${esc(lider.label)}</b> tem o maior ritmo: ${nf1.format(Math.max(a.rate,b.rate))} contra `+
           `${nf1.format(Math.min(a.rate,b.rate))} ciclos por mês ativo. `+
           `${esc(a.label)} soma ${nfInt.format(a.total)} ciclos em ${a.ativos} ${a.ativos===1?'mês':'meses'}; `+
           `${esc(b.label)}, ${nfInt.format(b.total)} em ${b.ativos}.`+
           `<br><br>Ressalva: a média por mês ativo pune quem tem histórico longo, porque meses de volume baixo `+
           `entram no divisor. Para comparação direta, use o filtro <b>Últimos 3 meses</b> — a janela em que os dois atuaram juntos.`;
    } else {
      nota=rows.filter(r=>r.total).map(r=>
        `<b>${esc(r.label)}</b>: ${nfInt.format(r.total)} ciclos em ${r.ativos} ${r.ativos===1?'mês':'meses'} ativos.`).join(' ');
    }
    el.innerHTML=h+`<div class="cmpnote">${nota}</div>`;
  }

  function kpis(s){
    const st=n=>{
      const c=s.ciclos.filter(x=>x.analista===n);
      const act=new Set(c.map(x=>x.mes)).size;
      return {ciclos:c.length,ativos:act,rate:act?c.length/act:0};
    };
    const dias=s.fila.map(f=>f.diasNaFila).sort((x,y)=>x-y);
    const med=dias.length?dias[Math.floor(dias.length/2)]:0;
    const val=s.fila.reduce((x,y)=>x+y.valor,0);
    /* um bloco destacado por analista em foco, na ordem em que o dado os traz */
    const heros=FOCO.map(f=>{
      const t=st(f.nome);
      return `<div class="tile hero" style="--tc:${f.color}"><div class="k">${esc(f.curto)}</div>`+
             `<div class="v">${nfInt.format(t.ciclos)}<small> ciclos</small></div>`+
             `<div class="n">${nf1.format(t.rate)} por mês ativo · ${t.ativos} ${t.ativos===1?'mês':'meses'} de atuação</div></div>`;
    }).join('');
    document.getElementById('a-kpis').innerHTML=heros+`
      <div class="tile"><div class="k">Ciclos no recorte</div><div class="v">${nfInt.format(s.ciclos.length)}</div>
        <div class="n">análises entregues à conferência</div></div>
      <div class="tile"><div class="k">Trocas de área</div><div class="v">${nfInt.format(s.areas.length)}</div>
        <div class="n">reatribuições manuais de responsável</div></div>
      <div class="tile alert"><div class="k">Parado em conferência</div><div class="v">${nfInt.format(s.fila.length)}</div>
        <div class="n">mediana de ${nfInt.format(med)} dias aguardando supervisão</div></div>
      <div class="tile"><div class="k">Valor retido na fila</div><div class="v">${nfBRL.format(val)}</div>
        <div class="n">prejuízo sem parecer da supervisão</div></div>`;
  }

  function table(rows){
    const sorted=[...rows].sort((x,y)=>{
      const a=x[sortKey],b=y[sortKey];
      if(sortKey==='valor'||sortKey==='diasNaFila') return ((+a||0)-(+b||0))*sortDir;
      return String(a||'').localeCompare(String(b||''),'pt-BR')*sortDir;
    });
    const sl=sorted.slice(0,shown);
    document.querySelector('#a-dt tbody').innerHTML=sl.map(r=>`<tr>
      <td><a href="${JIRA}${esc(r.key)}" target="_blank" rel="noopener">${esc(r.key)}</a></td>
      <td style="color:var(--text-secondary)"><span class="dot" style="background:${COLOR(key(r.enviadoPor))}"></span>${esc(SHORT(r.enviadoPor))}</td>
      <td class="num" style="color:var(--text-secondary)">${esc(mLab(r.mesEnvio))}</td>
      <td class="num ${r.diasNaFila>180?'age-hi':''}">${nfInt.format(r.diasNaFila)}</td>
      <td class="num" style="font-weight:620">${nfBRL2.format(r.valor)}</td></tr>`).join('');
    document.getElementById('a-count').textContent=
      `Exibindo ${nfInt.format(sl.length)} de ${nfInt.format(rows.length)} chamados na fila · R$ ${nfBRL2.format(rows.reduce((a,b)=>a+b.valor,0))}`;
    document.getElementById('a-more').style.display=sl.length<rows.length?'':'none';
    document.querySelectorAll('#a-dt th').forEach(th=>{
      const a=th.querySelector('.ar');
      a.textContent=th.dataset.s===sortKey?(sortDir>0?'▲':'▼'):'↕';
      a.style.opacity=th.dataset.s===sortKey?1:.45;
    });
  }

  function render(){
    const s=scoped(), defs=activeSeries(), months=s.months;
    kpis(s);
    legendInto('lg-linha',defs,true);
    lines('ch-linha',months,defs.map(d=>({label:d.label,color:d.color,
      values:months.map(m=>s.ciclos.filter(c=>c.mes===m&&key(c.analista)===d.k).length)})));
    timeline(s); ritmo(s);
    legendInto('lg-fila',defs);
    barsInto('ch-fila',FQ,defs.map(d=>({label:d.label,color:d.color,
      values:FQ.map(f=>s.fila.filter(x=>x.faixa===f&&key(x.enviadoPor)===d.k).length)})),
      {catLabel:c=>c.replace(' dias',''),h:264,mB:44});
    const au=new Map();
    s.areas.forEach(a=>au.set(a.autor,(au.get(a.autor)||0)+1));
    hbarsInto('ch-autor',[...au.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10)
      .map(([k,v])=>({name:SHORT(k),value:v,color:COLOR(key(k))})));
    const fl=new Map();
    s.areas.forEach(a=>{const k=a.de+' → '+a.para; fl.set(k,(fl.get(k)||0)+1);});
    hbarsInto('ch-fluxo',[...fl.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10)
      .map(([k,v])=>({name:k,value:v})));
    table(s.fila);
  }

  ['fAnalista','fPeriodo'].forEach(id=>document.getElementById(id)
    .addEventListener('change',()=>{shown=100;render();}));
  document.getElementById('a-clear').addEventListener('click',()=>{
    document.getElementById('fAnalista').value='';
    document.getElementById('fPeriodo').value='';
    shown=100; render();});
  document.querySelectorAll('#a-dt th').forEach(th=>th.addEventListener('click',()=>{
    const k=th.dataset.s;
    if(k===sortKey) sortDir*=-1; else {sortKey=k; sortDir=(k==='valor'||k==='diasNaFila')?-1:1;}
    render();}));
  document.getElementById('a-more').addEventListener('click',()=>{shown+=100;render();});
  document.getElementById('a-csv').addEventListener('click',()=>{
    const rows=scoped().fila, q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
    const csv='﻿'+['Chave;Enviado por;Desde;Dias na fila;Valor R$',
      ...rows.map(r=>[r.key,r.enviadoPor,r.mesEnvio,r.diasNaFila,String(r.valor).replace('.',',')].map(q).join(';'))].join('\r\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    a.download='sdprej-fila-conferencia-'+new Date().toISOString().slice(0,10)+'.csv'; a.click();});

  document.getElementById('a-tot').textContent=nfInt.format(DA.totalFiltro);
  return {render};
})();

/* ===================== GDIS: modelo compartilhado ===================== */
const GCLS=[
  {c:'pen',lbl:'Pendente de análise',color:'var(--ord-1)'},
  {c:'ana',lbl:'Em análise (N1/N2/N3)',color:'var(--ord-2)'},
  {c:'usr',lbl:'Aguardando validação do usuário',color:'var(--ord-3)'},
  {c:'fim',lbl:'Concluído / cancelado',color:'var(--ord-5)'},
  {c:'sem',lbl:'Sem vínculo rastreável',color:'var(--neutral)'}
];
const GCOL=Object.fromEntries(GCLS.map(c=>[c.c,c]));
const GBK={pen:'pen',n1:'ana',n2:'ana',n3:'ana',usr:'usr',res:'fim',can:'fim',des:'fim',
           nf:'sem',oth:'sem',txt:'sem',vaz:'sem'};
const GBKLBL={nf:'GDIS informado não localizado',oth:'chave de outro projeto',
              txt:'texto livre, sem chave',vaz:'campo em branco'};
const GNIV=[{c:'n1',lbl:'Nível 1',color:'var(--ord-1)'},
            {c:'n2',lbl:'Nível 2',color:'var(--ord-3)'},
            {c:'n3',lbl:'Nível 3',color:'var(--ord-5)'}];

const GI=GD.rows.map(r=>{
  const bk=r[6], g=r[5]||'';
  return {key:'SDPREJ-'+r[0],etapa:GD.sts[r[1]],tema:GD.temas[r[2]],valor:r[3],dias:r[4],
          gdis:g,bk:bk,cls:GBK[bk]||'sem',gstat:r[7]>=0?GD.gsts[r[7]]:'',
          temG:/^GDIS-\d+$/.test(g)};
});
const GLK=new Map(GI.map(o=>[o.key,o]));
const gpill=cls=>`<span class="gpill"><i style="background:${GCOL[cls].color}"></i>${esc(GCOL[cls].lbl)}</span>`;
function gdisPill(key){
  const e=GLK.get(key);
  if(!e) return '<span style="color:var(--muted)">—</span>';
  return `<span class="gpill" title="${esc(GCOL[e.cls].lbl)}"><i style="background:${GCOL[e.cls].color}"></i>`+
         `${esc(e.gstat||GBKLBL[e.bk]||'—')}</span>`;
}
/* enriquece a tabela da visão por tema com o estado do incidente */
DT.issues.forEach(i=>{const e=GLK.get(i.key);
  i.gcls=e?GCOL[e.cls].lbl:'—';
  i.gstat=e?(e.gstat||GBKLBL[e.bk]||''):'';
  i.gkey=e?(e.temG?e.gdis:''):'';});

/* barras horizontais 100% empilhadas */
function stackedInto(mountId,rows,classes,opt){
  opt=opt||{};
  const el=document.getElementById(mountId); el.innerHTML='';
  if(!rows.length){ el.innerHTML='<div class="empty">Sem dados no recorte atual.</div>'; return; }
  rows.forEach(r=>{
    const tot=classes.reduce((a,c)=>a+(r.parts[c.c]||0),0)||1;
    const act=classes.filter(c=>(r.parts[c.c]||0)>0);
    const row=document.createElement('div'); row.className='skrow';
    row.innerHTML=`<div class="hlab" title="${esc(r.name)}">${esc(r.name)}</div>`+
      `<div class="sktrack">`+act.map(c=>
        `<div class="skseg" style="flex:0 0 ${(r.parts[c.c]/tot*100).toFixed(3)}%;background:${c.color}"></div>`).join('')+
      `</div>`+
      `<div class="hval">${opt.fmt?opt.fmt(r,tot):nfInt.format(tot)}</div>`;
    bindTip(row,`<b>${esc(r.name)}</b>`+act.map(c=>
      `<span><i style="background:${c.color}"></i>${esc(c.lbl)}: ${nfInt.format(r.parts[c.c])}`+
      ` &middot; ${(r.parts[c.c]/tot*100).toFixed(1).replace('.',',')}%</span>`).join('')+
      `<span style="margin-top:4px">Total: ${nfInt.format(tot)} chamados`+
      (r.valor!=null?` &middot; R$ ${nfBRL2.format(r.valor)}`:'')+`</span>`);
    el.appendChild(row);
  });
}

/* ===================== VIEW: GDIS ===================== */
const ViewGdis=(function(){
  let metric='count', sortKey='dias', sortDir=-1, shown=100;
  const ETAPAS=[...new Set(GI.map(o=>o.etapa))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const TEMAS=[...new Set(GI.map(o=>o.tema))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  function fill(id,vals){
    const s=document.getElementById(id);
    vals.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;s.appendChild(o);});
  }
  fill('gEtapa',ETAPAS); fill('gTema',TEMAS); fill('gSit',GCLS.map(c=>c.lbl));

  const sum=(rs,f)=>rs.reduce((a,r)=>a+f(r),0);
  const avgD=rs=>rs.length?Math.round(sum(rs,r=>r.dias)/rs.length):0;
  const fmtM=v=>metric==='count'?nfInt.format(v):nfBRL.format(v);
  const pc=(a,b)=>b?(a/b*100).toFixed(1).replace('.',','):'0';

  function current(){
    const e=document.getElementById('gEtapa').value, t=document.getElementById('gTema').value,
          s=document.getElementById('gSit').value,
          q=document.getElementById('gBusca').value.trim().toLowerCase();
    return GI.filter(o=>{
      if(e&&o.etapa!==e) return false;
      if(t&&o.tema!==t) return false;
      if(s&&GCOL[o.cls].lbl!==s) return false;
      if(q){
        const hay=[o.key,o.gdis,o.gstat,o.tema,o.etapa,GCOL[o.cls].lbl].filter(Boolean).join(' ').toLowerCase();
        if(!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function kpis(rs){
    const n=rs.length, val=sum(rs,r=>r.valor);
    const comG=rs.filter(r=>r.temG), semV=rs.filter(r=>r.cls==='sem');
    const fim=rs.filter(r=>r.cls==='fim'), ana=rs.filter(r=>r.cls==='ana');
    const dist=new Set(comG.map(r=>r.gdis)).size;
    document.getElementById('g-kpis').innerHTML=`
      <div class="tile"><div class="k">Chamados no recorte</div><div class="v">${nfInt.format(n)}</div>
        <div class="n">${nfBRL.format(val)} em prejuízo reclamado</div></div>
      <div class="tile"><div class="k">Com chave GDIS</div>
        <div class="v">${nfInt.format(comG.length)}<small> · ${pc(comG.length,n)}%</small></div>
        <div class="n"><b>${nfInt.format(dist)}</b> incidentes distintos — um GDIS pode gerar vários prejuízos</div></div>
      <div class="tile alert"><div class="k">Sem vínculo rastreável</div>
        <div class="v">${nfInt.format(semV.length)}<small> · ${pc(semV.length,n)}%</small></div>
        <div class="n">${nfBRL.format(sum(semV,r=>r.valor))} sem incidente identificável</div></div>
      <div class="tile hero" style="--tc:var(--warning)"><div class="k">GDIS já concluído</div>
        <div class="v">${nfInt.format(fim.length)}<small> · ${pc(fim.length,n)}%</small></div>
        <div class="n">chamado aberto há <b>${nfInt.format(avgD(fim))} dias</b> em média, sem análise técnica pendente</div></div>
      <div class="tile"><div class="k">Aguardando GDIS em análise</div>
        <div class="v">${nfInt.format(ana.length)}<small> · ${pc(ana.length,n)}%</small></div>
        <div class="n">idade média de ${nfInt.format(avgD(ana))} dias</div></div>`;
  }

  function chSit(rs){
    const rows=GCLS.map(c=>{
      const g=rs.filter(r=>r.cls===c.c);
      return {name:c.lbl,value:metric==='count'?g.length:sum(g,r=>r.valor),color:c.color,n:g.length,
        tip:`<span>${nfInt.format(g.length)} chamados &middot; ${pc(g.length,rs.length)}% do recorte</span>`+
            `<span>R$ ${nfBRL2.format(sum(g,r=>r.valor))}</span>`+
            (g.length?`<span>idade média ${nfInt.format(avgD(g))} dias</span>`:'')};
    }).filter(r=>r.n>0);
    hbarsInto('g-ch-sit',rows,{fmt:r=>fmtM(r.value)});
    document.getElementById('g-cs-sit').innerHTML=
      `Ordem do ciclo de vida do incidente — o tom se intensifica conforme a análise avança. `+
      `<b>Sem vínculo rastreável</b> fica fora da escala, em cinza, porque não é um estágio: é ausência de informação.`;
  }

  function chEtapa(rs){
    const rows=ETAPAS.map(e=>{
      const g=rs.filter(r=>r.etapa===e), parts={};
      GCLS.forEach(c=>parts[c.c]=g.filter(r=>r.cls===c.c).length);
      return {name:e,parts:parts,n:g.length,valor:sum(g,r=>r.valor)};
    }).filter(r=>r.n>0).sort((a,b)=>b.n-a.n);
    stackedInto('g-ch-etapa',rows,GCLS,{fmt:r=>nfInt.format(r.n)});
    legendInto('g-lg-etapa',GCLS.map(c=>({label:c.lbl,color:c.color})));

    const fila=rs.filter(r=>/rea respons/i.test(r.etapa));
    const ff=fila.filter(r=>r.cls==='fim'), fa=fila.filter(r=>r.cls==='ana');
    document.getElementById('g-note-etapa').innerHTML = fila.length
      ? `Na etapa <b>análise área responsável</b>, <b>${nfInt.format(ff.length)} dos ${nfInt.format(fila.length)}</b> `+
        `chamados (${pc(ff.length,fila.length)}%) apontam um GDIS <b>já concluído</b> — `+
        `<b>R$ ${nfBRL2.format(sum(ff,r=>r.valor))}</b>, com idade média de <b>${nfInt.format(avgD(ff))} dias</b>. `+
        (fa.length?`Os que de fato aguardam análise técnica esperam, em média, <b>${nfInt.format(avgD(fa))} dias</b>. `+
          `A diferença indica que a espera está no processo de prejuízo, não na investigação do incidente.`
          :`Nenhum chamado dessa etapa aguarda análise técnica no recorte atual.`)
      : `Nenhum chamado da etapa <b>análise área responsável</b> no recorte atual.`;
  }

  function chNivel(rs){
    const em=rs.filter(r=>r.cls==='ana');
    const rows=GNIV.map(nv=>{
      const g=em.filter(r=>r.bk===nv.c);
      return {name:nv.lbl,value:metric==='count'?g.length:sum(g,r=>r.valor),color:nv.color,
        tip:`<span>${nfInt.format(g.length)} chamados &middot; ${pc(g.length,em.length)}% dos em análise</span>`+
            `<span>R$ ${nfBRL2.format(sum(g,r=>r.valor))}</span>`+
            (g.length?`<span>idade média ${nfInt.format(avgD(g))} dias</span>`:'')};
    });
    hbarsInto('g-ch-niv',rows,{fmt:r=>fmtM(r.value)});
    const n3=em.filter(r=>r.bk==='n3');
    document.getElementById('g-note-niv').innerHTML = em.length
      ? `<b>${nfInt.format(em.length)}</b> chamados aguardam análise técnica. O <b>Nível 3</b> concentra `+
        `${nfInt.format(n3.length)} deles (${pc(n3.length,em.length)}%) — é o escalonamento mais profundo e o que `+
        `costuma travar mais tempo.`
      : `Nenhum GDIS em análise no recorte atual.`;
  }

  function chIdade(rs){
    const rows=GCLS.map(c=>{
      const g=rs.filter(r=>r.cls===c.c);
      return {name:c.lbl,value:avgD(g),n:g.length,
        tip:`<span>${nfInt.format(g.length)} chamados</span>`+
            `<span>idade média ${nfInt.format(avgD(g))} dias</span>`+
            (g.length?`<span>mais antigo ${nfInt.format(Math.max(...g.map(r=>r.dias)))} dias</span>`:'')};
    }).filter(r=>r.n>0);
    hbarsInto('g-ch-idade',rows,{fmt:r=>nfInt.format(r.value)+' d'});
  }

  function chTema(rs){
    let arr=TEMAS.map(t=>{
      const g=rs.filter(r=>r.tema===t), parts={};
      GCLS.forEach(c=>parts[c.c]=g.filter(r=>r.cls===c.c).length);
      return {name:t,parts:parts,n:g.length,valor:sum(g,r=>r.valor)};
    }).filter(r=>r.n>0).sort((a,b)=>b.n-a.n);
    if(arr.length>10){
      const head=arr.slice(0,10), tail=arr.slice(10), parts={};
      GCLS.forEach(c=>parts[c.c]=tail.reduce((s,x)=>s+x.parts[c.c],0));
      head.push({name:`Outros (${tail.length} temas)`,parts:parts,
                 n:tail.reduce((s,x)=>s+x.n,0),valor:tail.reduce((s,x)=>s+x.valor,0)});
      arr=head;
    }
    stackedInto('g-ch-tema',arr,GCLS,{fmt:r=>nfInt.format(r.n)});
    legendInto('g-lg-tema',GCLS.map(c=>({label:c.lbl,color:c.color})));
  }

  function tblCat(rs){
    const m=new Map();
    rs.forEach(r=>{
      const k=r.gstat||GBKLBL[r.bk]||'—';
      const e=m.get(k)||{name:k,cls:r.cls,n:0,valor:0,gs:new Set()};
      e.n++; e.valor+=r.valor; if(r.temG) e.gs.add(r.gdis); m.set(k,e);
    });
    const arr=[...m.values()].sort((a,b)=>b.n-a.n);
    document.querySelector('#g-cat tbody').innerHTML=arr.length?arr.map(e=>`<tr>
      <td>${esc(e.name)}</td>
      <td>${gpill(e.cls)}</td>
      <td class="num">${e.gs.size?nfInt.format(e.gs.size):'—'}</td>
      <td class="num">${nfInt.format(e.n)}</td>
      <td class="num" style="font-weight:620">${nfBRL2.format(e.valor)}</td></tr>`).join('')
      :'<tr><td colspan="5" class="empty">Sem dados no recorte atual.</td></tr>';
  }

  function tblMulti(rs){
    const m=new Map();
    rs.filter(r=>r.temG).forEach(r=>{
      const e=m.get(r.gdis)||{g:r.gdis,cls:r.cls,gstat:r.gstat,keys:[],valor:0};
      e.keys.push(r.key); e.valor+=r.valor; m.set(r.gdis,e);
    });
    const arr=[...m.values()].filter(e=>e.keys.length>1)
      .sort((a,b)=>b.keys.length-a.keys.length||b.valor-a.valor);
    document.querySelector('#g-multi tbody').innerHTML=arr.length?arr.map(e=>`<tr>
      <td><a href="${JIRA}${esc(e.g)}" target="_blank" rel="noopener">${esc(e.g)}</a></td>
      <td>${gpill(e.cls)}</td>
      <td class="num">${nfInt.format(e.keys.length)}</td>
      <td class="num" style="font-weight:620">${nfBRL2.format(e.valor)}</td>
      <td class="sum" title="${esc(e.keys.join(', '))}">${esc(e.keys.join(', '))}</td></tr>`).join('')
      :'<tr><td colspan="5" class="empty">Nenhum GDIS repetido no recorte atual.</td></tr>';
    document.getElementById('g-cs-multi').innerHTML=
      `<b>${nfInt.format(arr.length)}</b> incidentes respondem por <b>${nfInt.format(arr.reduce((s,e)=>s+e.keys.length,0))}</b> `+
      `chamados de prejuízo, somando <b>R$ ${nfBRL2.format(arr.reduce((s,e)=>s+e.valor,0))}</b>. `+
      `Resolver um desses fecha vários prejuízos de uma vez.`;
  }

  function tblSem(rs){
    const arr=rs.filter(r=>r.cls==='sem').sort((a,b)=>b.valor-a.valor);
    document.querySelector('#g-sem tbody').innerHTML=arr.length?arr.map(r=>`<tr>
      <td><a href="${JIRA}${esc(r.key)}" target="_blank" rel="noopener">${esc(r.key)}</a></td>
      <td><span class="pill">${esc(GBKLBL[r.bk]||'—')}</span></td>
      <td class="raw">${esc(r.gdis||'(vazio)')}</td>
      <td class="num">${nfInt.format(r.dias)}</td>
      <td class="num" style="font-weight:620">${nfBRL2.format(r.valor)}</td></tr>`).join('')
      :'<tr><td colspan="5" class="empty">Todos os chamados do recorte têm GDIS rastreável.</td></tr>';
    document.getElementById('g-cs-sem').innerHTML=
      `<b>${nfInt.format(arr.length)}</b> chamados &middot; <b>R$ ${nfBRL2.format(sum(arr,r=>r.valor))}</b>. `+
      `A coluna do meio traz o conteúdo bruto do campo, do jeito que está no Jira, para permitir a correção.`;
  }

  function table(rs){
    const sorted=[...rs].sort((a,b)=>{
      if(sortKey==='valor'||sortKey==='dias') return ((+a[sortKey]||0)-(+b[sortKey]||0))*sortDir;
      if(sortKey==='cls') return (GCLS.findIndex(c=>c.c===a.cls)-GCLS.findIndex(c=>c.c===b.cls))*sortDir;
      return String(a[sortKey]||'').localeCompare(String(b[sortKey]||''),'pt-BR')*sortDir;
    });
    const sl=sorted.slice(0,shown);
    document.querySelector('#g-dt tbody').innerHTML=sl.length?sl.map(r=>`<tr>
      <td><a href="${JIRA}${esc(r.key)}" target="_blank" rel="noopener">${esc(r.key)}</a></td>
      <td style="color:var(--text-secondary)">${esc(r.etapa)}</td>
      <td><span class="pill">${esc(r.tema)}</span></td>
      <td>${r.temG?`<a href="${JIRA}${esc(r.gdis)}" target="_blank" rel="noopener">${esc(r.gdis)}</a>`
                  :`<span class="raw">${esc(r.gdis||'—')}</span>`}</td>
      <td>${gdisPill(r.key)}</td>
      <td class="num ${r.dias>365?'age-hi':''}">${nfInt.format(r.dias)}</td>
      <td class="num" style="font-weight:620">${nfBRL2.format(r.valor)}</td></tr>`).join('')
      :'<tr><td colspan="7" class="empty">Sem chamados no recorte atual.</td></tr>';
    document.getElementById('g-count').textContent=
      `Exibindo ${nfInt.format(sl.length)} de ${nfInt.format(rs.length)} chamados · soma do recorte R$ ${nfBRL2.format(sum(rs,r=>r.valor))}`;
    document.getElementById('g-more').style.display=sl.length<rs.length?'':'none';
    document.querySelectorAll('#g-dt th').forEach(th=>{
      const a=th.querySelector('.ar'); if(!a) return;
      a.textContent=th.dataset.s===sortKey?(sortDir>0?'▲':'▼'):'↕';
      a.style.opacity=th.dataset.s===sortKey?1:.45;
    });
  }

  function render(){
    const rs=current();
    kpis(rs); chSit(rs); chEtapa(rs); chNivel(rs); chIdade(rs); chTema(rs);
    tblCat(rs); table(rs); tblMulti(rs); tblSem(rs);
  }

  ['gEtapa','gTema','gSit'].forEach(id=>document.getElementById(id)
    .addEventListener('change',()=>{shown=100;render();}));
  let deb; document.getElementById('gBusca').addEventListener('input',()=>{
    clearTimeout(deb); deb=setTimeout(()=>{shown=100;render();},180);});
  document.getElementById('g-clear').addEventListener('click',()=>{
    ['gEtapa','gTema','gSit'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('gBusca').value=''; shown=100; render();});
  document.getElementById('gMetric').addEventListener('click',e=>{
    const b=e.target.closest('button[data-m]'); if(!b) return;
    metric=b.dataset.m;
    [...e.currentTarget.querySelectorAll('button')].forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    render();});
  document.querySelectorAll('#g-dt th').forEach(th=>th.addEventListener('click',()=>{
    const k=th.dataset.s; if(!k) return;
    if(k===sortKey) sortDir*=-1; else {sortKey=k; sortDir=(k==='valor'||k==='dias')?-1:1;}
    render();}));
  document.getElementById('g-more').addEventListener('click',()=>{shown+=100;render();});
  document.getElementById('g-csv').addEventListener('click',()=>{
    const rs=current();
    const head=['Chave','Etapa do SDPREJ','Tema','GDIS','Status do GDIS','Situacao aplicada','Dias aberto','Valor R$'];
    const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
    const csv='﻿'+[head.join(';'),...rs.map(r=>[r.key,r.etapa,r.tema,r.gdis,
        r.gstat||GBKLBL[r.bk]||'',GCOL[r.cls].lbl,r.dias,String(r.valor).replace('.',',')]
      .map(q).join(';'))].join('\r\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    a.download='sdprej-gdis-'+new Date().toISOString().slice(0,10)+'.csv'; a.click();});

  return {render};
})();


/* ===================== view switching ===================== */
let currentView='temas';
const VIEWS={temas:{sec:'view-temas',tab:'tab-temas',ger:()=>DT.geradoEm,r:()=>ViewTemas.render()},
             gdis :{sec:'view-gdis', tab:'tab-gdis', ger:()=>GD.geradoEm,r:()=>ViewGdis.render()},
             ana  :{sec:'view-ana',  tab:'tab-ana',  ger:()=>DA.geradoEm,r:()=>ViewAna.render()}};
function show(v){
  currentView=v;
  for(const k in VIEWS){
    document.getElementById(VIEWS[k].sec).hidden=(k!==v);
    document.getElementById(VIEWS[k].tab).setAttribute('aria-selected',String(k===v));
  }
  document.getElementById('chipGer').textContent='Extraído do Jira em '+VIEWS[v].ger();
  VIEWS[v].r();
  hideTip();
  scrollTo({top:0,behavior:'instant'});
}
for(const k in VIEWS) document.getElementById(VIEWS[k].tab).addEventListener('click',()=>show(k));
document.getElementById('themeBtn').addEventListener('click',()=>{
  const cur=document.documentElement.getAttribute('data-theme');
  const dark=cur?cur==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme',dark?'light':'dark');
});
document.getElementById('chipGer').textContent='Extraído do Jira em '+DT.geradoEm;
ViewTemas.render();

addEventListener('resize',()=>{clearTimeout(window.__r);
  window.__r=setTimeout(()=>VIEWS[currentView].r(),180);});
