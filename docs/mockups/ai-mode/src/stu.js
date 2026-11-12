/* Studio v4: tick several tiles, then one "Make selected" builds ONE plan of real catalog steps */
const STU=[['notes','Notes','note','pg_add'],['map','Mind map','map','map_new'],['cards','Cards','layers','cards_new'],['quiz','Quiz','quiz','cards_quiz'],['summary','Summary','text','sum_tab']];
const stuDest=()=>{const d=S.stu.d;return d.kind==='new'?{kind:'new',name:(d.name||'').trim()||'Habits that stick',nb:d.nb,sec:d.sec}:{kind:'nb',name:d.name,nb:d.nb,sec:d.sec}};
function stuPlan(){const U=S.stu,d=stuDest(),ids=[];if(d.kind==='new')ids.push('nb_new');ids.push('pg_add');STU.forEach(x=>{if(x[0]!=='notes'&&U.sel.includes(x[0]))ids.push(x[3])});
 return ids.map(id=>mkStep(id,id==='pg_add'&&!U.sel.includes('notes')?'A page to hold what you picked.':null))}
function stuPanel(){const U=S.stu,n=U.sel.length,d=stuDest();
 let h='<section class="pn pn-stu" aria-label="Studio"><div class="ph"><h2>Studio</h2><span class="mini">Tick what to make</span></div><div class="pb2"><div class="mk2" role="group" aria-label="What to make">'+
 STU.map(x=>'<button type="button" class="tile" data-a="stsel" data-k="'+x[0]+'" aria-pressed="'+U.sel.includes(x[0])+'">'+IC(x[2])+x[1]+'<span class="tkk" aria-hidden="true">'+IC('check')+'</span></button>').join('')+'<button type="button" class="tile" disabled aria-disabled="true" title="Coming later">'+IC('audio')+'<span>Audio<span class="later">Later</span></span></button></div>';
 if(n){const P=stuPlan();
  h+='<div class="mkbar"><span class="lbl">Where it goes</span>'+destPick('st',S.stu.d)+
  '<ul class="mkl" aria-label="What will be made">'+STU.filter(x=>U.sel.includes(x[0])).map(x=>'<li><b>'+x[1]+'</b><small>'+esc(place(d,TOOL[x[3]]))+'</small></li>').join('')+'</ul>'+
  '<div class="row sp">'+chip()+bEst(P)+'</div><button type="button" class="btn pri" data-a="mksel">'+IC('wand')+'Make selected ('+n+')</button><p class="note">Opens as one plan in Build. You check it before it runs.</p></div>'}
 else h+='<p class="note" style="margin:0 4px 12px">Tick one or more. They are made together as one plan.</p>';
 h+='<div class="olist" id="olist">'+S.out.map(o=>'<div class="o2" data-id="'+o.id+'"><div class="oh"><button type="button" class="gp" aria-label="Drag to move '+esc(o.t)+' (or use the up and down arrow keys)" title="Drag to move">'+IC('grip')+'</button><b>'+esc(o.t)+'</b><button type="button" class="ib sm" data-a="rmout" data-id="'+o.id+'" aria-label="Remove '+esc(o.t)+'" title="Remove">'+IC('x')+'</button></div><div class="ob">'+outBody(o)+'</div><div class="of"><button type="button" class="btn sm" data-a="saveout" data-id="'+o.id+'">'+IC(o.saved?'check':'save')+(o.saved?'Saved to notes':'Save to notes')+'</button></div></div>').join('')+'</div>'+
 (S.out.length?'':'<div class="empty">Nothing made yet.</div>')+'</div></section>';
 return h}
