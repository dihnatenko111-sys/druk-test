/* Перегляд макета прямо на сайті: превʼю, розміри, масштаб, вильоти, роздільна здатність,
   колірна модель, текст не в кривих, відступи вмісту до краю. Спільне для адмінки й кабінету клієнта.
   PDF читає pdf.js, TIFF — UTIF (обидва підвантажуються лише при першому відкритті PDF / TIFF). */
const LREQ={ bleed:[3,5], safe:20, safeEyelet:30, dpi:{sol:72,eco:100,eco2:150,uv:150,uvw:150,uvwc:150} };
const VLIB={
  pdf:'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfWorker:'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  tiff:'https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js',
};
const _scripts={};
function loadScript(src){ return _scripts[src]||(_scripts[src]=new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('lib')); document.head.appendChild(s); })); }

/* ---------- читання параметрів файлу ---------- */
const u16=(d,o,le)=>d.getUint16(o,le), u32=(d,o,le)=>d.getUint32(o,le);
function jpegInfo(buf){
  const d=new DataView(buf); if(u16(d,0)!==0xFFD8) return null; let o=2, dpi=null, adobe=false, out={};
  while(o<d.byteLength-4){ if(d.getUint8(o)!==0xFF){ o++; continue; } const m=d.getUint8(o+1), len=u16(d,o+2);
    if(m===0xE0&&d.getUint32(o+4)===0x4A464946){ const unit=d.getUint8(o+11), x=u16(d,o+12); if(x>1) dpi=unit===1?x:unit===2?x*2.54:null; }
    if(m===0xEE) adobe=true;
    if(m>=0xC0&&m<=0xCF&&![0xC4,0xC8,0xCC].includes(m)){ out={h:u16(d,o+5),w:u16(d,o+7),comp:d.getUint8(o+9)}; break; }
    o+=2+len; }
  if(!out.w) return null;
  return {px:{w:out.w,h:out.h},dpi,color:out.comp===4?'CMYK':out.comp===1?'Відтінки сірого':'RGB'};
}
function pngInfo(buf){
  const d=new DataView(buf); if(u32(d,0)!==0x89504E47) return null; const w=u32(d,16), h=u32(d,20), ct=d.getUint8(25); let dpi=null, o=8;
  while(o<d.byteLength-12){ const len=u32(d,o), type=u32(d,o+4); if(type===0x70485973&&d.getUint8(o+16)===1) dpi=u32(d,o+8)*0.0254; if(type===0x49444154) break; o+=12+len; }
  return {px:{w,h},dpi,color:ct===0||ct===4?'Відтінки сірого':'RGB'};
}
function tiffInfo(buf){
  const d=new DataView(buf), bo=u16(d,0); if(bo!==0x4949&&bo!==0x4D4D) return null; const le=bo===0x4949; let o=u32(d,4,le); const n=u16(d,o,le), t={};
  for(let i=0;i<n;i++){ const e=o+2+i*12, tag=u16(d,e,le), type=u16(d,e+2,le), vo=e+8;
    const val=type===3?u16(d,vo,le):type===4?u32(d,vo,le):type===5?(()=>{ const p=u32(d,vo,le); return u32(d,p,le)/u32(d,p+4,le); })():null; t[tag]=val; }
  const unit=t[296]||2, res=t[282]; const dpi=res?(unit===3?res*2.54:res):null;
  return {px:{w:t[256],h:t[257]},dpi,color:t[262]===5?'CMYK':t[262]===1||t[262]===0?'Відтінки сірого':'RGB'};
}
// межі вмісту на зображенні: усе, що не білий / не прозорий фон
function contentBox(cv){
  const g=cv.getContext('2d',{willReadFrequently:true}), {width:W,height:H}=cv, px=g.getImageData(0,0,W,H).data;
  let x0=W,y0=H,x1=-1,y1=-1; const step=Math.max(1,Math.round(Math.max(W,H)/900));
  for(let y=0;y<H;y+=step) for(let x=0;x<W;x+=step){ const i=(y*W+x)*4; if(px[i+3]>12&&(px[i]<244||px[i+1]<244||px[i+2]<244)){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
  return x1<0?null:{x0:x0/W,y0:y0/H,x1:Math.min(1,(x1+step)/W),y1:Math.min(1,(y1+step)/H)};
}
function canvasFrom(src,w,h,max=1100){ const k=Math.min(1,max/Math.max(w,h)), c=document.createElement('canvas'); c.width=Math.max(1,Math.round(w*k)); c.height=Math.max(1,Math.round(h*k));
  const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(src,0,0,c.width,c.height); return c; }

async function analyzeFile(blob,name){
  const ext=(name.match(/\.([a-z0-9]+)$/i)||['',''])[1].toLowerCase(), type=blob.type||'';
  const head=await blob.slice(0,Math.min(blob.size,4<<20)).arrayBuffer(), info={name,size:blob.size,ext:ext.toUpperCase()||'—'};
  try{
    if(/pdf/.test(type)||ext==='pdf'){
      info.kind='pdf'; await loadScript(VLIB.pdf); pdfjsLib.GlobalWorkerOptions.workerSrc=VLIB.pdfWorker;
      const buf=await blob.arrayBuffer(), raw=new TextDecoder('latin1').decode(new Uint8Array(buf,0,Math.min(buf.byteLength,8<<20)));
      const doc=await pdfjsLib.getDocument({data:new Uint8Array(buf.slice(0))}).promise, p=await doc.getPage(1), v=p.view;
      info.pages=doc.numPages; info.mm={w:(v[2]-v[0])*25.4/72,h:(v[3]-v[1])*25.4/72};
      const box=k=>{ const m=new RegExp('/'+k+'\\s*\\[\\s*([\\d.\\-]+)\\s+([\\d.\\-]+)\\s+([\\d.\\-]+)\\s+([\\d.\\-]+)').exec(raw); return m?{w:(m[3]-m[1])*25.4/72,h:(m[4]-m[2])*25.4/72}:null; };
      info.trim=box('TrimBox'); info.bleedBox=box('BleedBox');
      info.color=/DeviceCMYK|\/ICCBased[\s\S]{0,40}\/N 4/.test(raw)?'CMYK':/DeviceRGB/.test(raw)?'RGB':null;
      const tc=await p.getTextContent(); info.text=tc.items.some(i=>i.str&&i.str.trim());
      const vp0=p.getViewport({scale:1}), sc=Math.min(1100/vp0.width,900/vp0.height,4), vp=p.getViewport({scale:sc});
      const c=document.createElement('canvas'); c.width=Math.round(vp.width); c.height=Math.round(vp.height); const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height);
      await p.render({canvasContext:g,viewport:vp}).promise; info.canvas=c;
    } else if(/tiff?/.test(type)||ext==='tif'||ext==='tiff'){
      info.kind='image'; Object.assign(info,tiffInfo(head)||{});
      if(blob.size<160<<20){ try{ await loadScript(VLIB.tiff); const buf=await blob.arrayBuffer(), ifds=UTIF.decode(buf); UTIF.decodeImage(buf,ifds[0]); const rgba=UTIF.toRGBA8(ifds[0]);
        const c=document.createElement('canvas'); c.width=ifds[0].width; c.height=ifds[0].height; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer),c.width,c.height),0,0);
        info.canvas=canvasFrom(c,c.width,c.height); }catch(e){ info.noPreview=true; } } else info.noPreview=true;
    } else if(/image\//.test(type)||['jpg','jpeg','png','webp','gif','svg'].includes(ext)){
      info.kind='image'; Object.assign(info,ext==='png'||/png/.test(type)?pngInfo(head)||{}:/jpe?g/.test(type)||ext==='jpg'||ext==='jpeg'?jpegInfo(head)||{}:{});
      const url=URL.createObjectURL(blob), img=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
      if(!info.px) info.px={w:img.naturalWidth,h:img.naturalHeight}; if(/svg/.test(type)||ext==='svg'){ info.kind='svg'; info.color='RGB'; }
      info.canvas=canvasFrom(img,img.naturalWidth,img.naturalHeight); URL.revokeObjectURL(url);
    } else info.kind='other';
  }catch(e){ info.err=true; }
  if(info.px&&info.dpi) info.mm={w:info.px.w/info.dpi*25.4,h:info.px.h/info.dpi*25.4};
  if(info.canvas) info.bbox=contentBox(info.canvas);
  return info;
}

/* ---------- перевірка щодо параметрів замовлення ---------- */
function checkLayout(info,o){
  const W=+o.w, H=+o.h, opts=(o.opts||[]).join(' '), eyelet=/люверс/i.test(opts), cut=/порізк|висічк|плотер/i.test(opts), rows=[], warn=[];
  const add=(t,v,good,hint)=>{ rows.push({t,v,st:good===true?'ok':good===false?'bad':'info'}); if(good===false&&hint) warn.push(hint); };
  const near=(a,b,tol)=>Math.abs(a-b)<=tol;
  add('Розмір у замовленні',`${W} × ${H} мм`,null);
  if(info.px) add('Пікселі',`${info.px.w} × ${info.px.h} px${info.dpi?` · ${Math.round(info.dpi)} dpi`:' · dpi не вказано'}`,null);
  // орієнтація файлу відносно замовлення
  const fr=info.mm?info.mm.w/info.mm.h:info.px?info.px.w/info.px.h:W/H, rot=Math.abs(fr-H/W)<Math.abs(fr-W/H)&&W!==H;
  const Wf=rot?H:W, Hf=rot?W:H;
  // масштаб: 1:1, 1:10… (за розміром обрізу; допускаємо вильоти до 20 мм)
  let sc=null, fm=info.trim||info.mm;
  if(fm){ for(const k of [1,10,20,100]){ const dx=fm.w*k-Wf, dy=fm.h*k-Hf; if(dx>-Math.max(2,Wf*.01)&&dy>-Math.max(2,Hf*.01)&&dx<=40&&dy<=40){ sc=k; break; } } }
  const s=sc||1, fullW=info.mm?info.mm.w*s:Wf, fullH=info.mm?info.mm.h*s:Hf, blx=Math.max(0,(fullW-Wf)/2), bly=Math.max(0,(fullH-Hf)/2), bleed=Math.min(blx,bly);
  if(fm){
    add('Розмір макета',`${fmt1(fm.w)} × ${fmt1(fm.h)} мм${info.trim?' (TrimBox)':''}`,!!sc,`Розмір макета ${fmt1(fm.w)} × ${fmt1(fm.h)} мм не відповідає замовленню ${W} × ${H} мм`);
    add('Масштаб',sc?`1:${sc}`:'не збігається з розміром замовлення',!!sc);
    if(rot) add('Орієнтація','макет повернутий на 90° відносно замовлення',null);
    add('Вильоти',bleed>0.5?`${fmt1(bleed)} мм з кожного боку`:'немає',bleed>0.5?true:cut?false:null,cut?`Для порізки в розмір потрібні вильоти ${LREQ.bleed[0]}–${LREQ.bleed[1]} мм`:'');
  } else if(info.px){
    const match=Math.abs(fr-Wf/Hf)<=0.02*Wf/Hf;
    add('Пропорції',match?'збігаються із замовленням':`${fmt1(fr)} проти ${fmt1(Wf/Hf)}`,match,'Пропорції макета не збігаються з розміром замовлення');
  }
  // роздільна здатність на розмір друку
  if(info.px){ const e=Math.round(info.px.w/(fullW/25.4)), need=LREQ.dpi[o.qk]||100;
    add('Роздільна здатність на розмір друку',`${e} dpi (потрібно від ${need})`,e>=need,`Низька роздільна здатність: ${e} dpi при потрібних ${need} dpi`); }
  else if(info.kind==='pdf') add('Роздільна здатність','векторний PDF або вбудовані зображення — дивиться дизайнер',null);
  if(info.color) add('Колірна модель',info.color,info.color==='CMYK'?true:info.color==='RGB'?false:null,'Колірна модель RGB — кольори можуть змінитися при друці (потрібно CMYK)');
  if(info.kind==='pdf'){ add('Сторінок',String(info.pages),info.pages===1?true:null); add('Текст',info.text?'є текст — шрифти не переведені в криві':'у кривих або немає',!info.text,'Шрифти не переведені в криві'); }
  // відступи вмісту до лінії обрізу
  const safe=eyelet?LREQ.safeEyelet:LREQ.safe; let mg=null;
  if(info.bbox){ const b=info.bbox; mg={l:b.x0*fullW-blx,r:(1-b.x1)*fullW-blx,t:b.y0*fullH-bly,b:(1-b.y1)*fullH-bly};
    const full=Object.values(mg).every(v=>v<=0.5), close=Object.entries(mg).filter(([,v])=>v>0.5&&v<safe), N={l:'зліва',r:'справа',t:'зверху',b:'знизу'};
    add('Відступи вмісту до краю',full?'фон під обріз, до самого краю':Object.entries(mg).map(([k,v])=>`${N[k]} ${fmt1(Math.max(0,v))}`).join(' · ')+' мм',
      !close.length,`Вміст ближче ніж ${safe} мм до краю${eyelet?' (зона люверсів)':''}: ${close.map(([k,v])=>N[k]+' '+fmt1(v)+' мм').join(', ')}`); }
  add('Безпечна зона',`${safe} мм від краю${eyelet?' — є люверси':''}`,null);
  return {rows,warn,safe,mg,fullW,fullH,blx,bly};
}

/* ---------- вікно перегляду ---------- */
// o: {id,w,h,qk,opts}; f: файл замовлення; actions: HTML кнопок (адмінка — «Перевірено», «Повернути»)
async function openViewer(o,f,name,actions=''){
  const box=document.getElementById('modalBox');
  modal(`<div class="vw"><div class="vw-h"><h3>${esc(f.n)}</h3><span class="muted">Замовлення №${o.id}</span></div><div class="vw-load">Читаю файл…</div></div>`); box.classList.add('wide');
  const blob=await fileBlob(o,f), info=await analyzeFile(blob,f.fid?f.n:'demo.svg'), chk=checkLayout(info,o);
  if(!document.querySelector('#modal.on')||!box.querySelector('.vw')) return;
  const st={ok:['✓','b-green'],bad:['!','b-red'],info:['·','b-gray']};
  box.querySelector('.vw').innerHTML=`<div class="vw-h"><h3>${esc(f.n)}</h3><span class="muted">Замовлення №${o.id} · ${info.ext} · ${fsize(info.size)}${f.fid?'':' · демо-файл'}</span>
     <span class="badge ${chk.warn.length?'b-amber':'b-green'}">${chk.warn.length?'Зауважень: '+chk.warn.length:'Готово до друку'}</span></div>
    <div class="vw-g"><div class="vw-pv">${info.canvas?'<div class="vw-cv"></div><div class="vw-lg"><span><i class="lg-t"></i>лінія обрізу</span><span><i class="lg-s"></i>безпечна зона</span><span><i class="lg-c"></i>межі вмісту</span></div>':`<div class="vw-none">${info.err?'Не вдалося прочитати файл.':info.noPreview?'Превʼю для цього файлу недоступне (завеликий TIFF) — параметри праворуч.':'Превʼю для цього формату недоступне.'}</div>`}</div>
     <div class="vw-info"><table>${chk.rows.map(r=>`<tr><td>${r.t}</td><td><span class="vw-st ${st[r.st][1]}">${st[r.st][0]}</span>${esc(r.v)}</td></tr>`).join('')}</table>
      ${chk.warn.length?`<div class="alert" style="margin:12px 0 0"><b>Зауваження</b>${chk.warn.map(esc).join('<br>')}</div>`:''}
      <div class="btns" style="margin-top:12px">${actions}<button class="btn" data-vw-dl>Завантажити</button></div></div></div>`;
  VW={o,f,name,chk};
  if(info.canvas){ const host=box.querySelector('.vw-cv'), c=info.canvas; c.className='vw-canvas'; host.appendChild(c);
    // накладки: обріз (з вильотами), безпечна зона, межі вмісту
    const ov=document.createElement('canvas'); ov.width=c.width; ov.height=c.height; ov.className='vw-ov'; host.appendChild(ov); const g=ov.getContext('2d');
    const kx=c.width/chk.fullW, ky=c.height/chk.fullH, bx=chk.blx*kx, by=chk.bly*ky, sx=chk.safe*kx, sy=chk.safe*ky;
    g.setLineDash([8,5]); g.lineWidth=2; g.strokeStyle='#16a34a'; g.strokeRect(bx,by,c.width-2*bx,c.height-2*by);
    g.strokeStyle='#f59e0b'; if(c.width-2*(bx+sx)>4&&c.height-2*(by+sy)>4) g.strokeRect(bx+sx,by+sy,c.width-2*(bx+sx),c.height-2*(by+sy));
    if(info.bbox){ g.setLineDash([]); g.lineWidth=1.5; g.strokeStyle='#2563eb'; const b=info.bbox; g.strokeRect(b.x0*c.width,b.y0*c.height,(b.x1-b.x0)*c.width,(b.y1-b.y0)*c.height); } }
}
let VW=null;
document.addEventListener('click',e=>{ if(e.target.closest('[data-vw-dl]')&&VW) fileSave(VW.o,VW.f,VW.name); });
