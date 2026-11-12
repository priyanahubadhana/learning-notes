/* ---------- v4 actions: everything runs through the framework (validate → Engine → commit → undo) ---------- */
const listWords=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];
function placeToast(){const t=$('#sh-top');if(!t)return;const r=t.getBoundingClientRect();document.documentElement.style.setProperty('--tt',Math.max(8,Math.round(r.top+(r.height-48)/2))+'px')}
addEventListener('resize',()=>{placeToast();if(FP)fpopDraw()});
function runBuild(){const B=S.B,v=validate(B.plan,B.dest);if(!v.ok){T('Fix the marked step first');return}
 CUR=B.plan;
 guard('build','Build: '+bTitle(),()=>{const j=Engine.start({title:bTitle(),plan:B.plan,dest:B.dest,fail:S.demo==='fail',onChange:fin=>{if(B.job!==j)return;if(fin&&B.stage==='running'){B.stage='preview';B.pv='notes';S.fx='preview'}render();if(fin){const pv=$('.pv');if(pv)pv.scrollIntoView({block:'start'})}}});
  if(!j)return;B.job=j;B.stage='running';S.fx='run';Engine.pump(j)});CUR=null}
Object.assign(A,{
 demo:b=>{S.demo=b.dataset.v;$$('[data-a=demo]').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});[S.B.job,QP.job].forEach(j=>{if(j&&j.state==='offline')Engine.pump(j)})},
 /* Build */
 mkplan:()=>{const B=S.B,g=B.goal.trim();if(!g){T('Describe what to build first');return}const p=makePlan(g,false,B.dest);S.fx='plan';
  planEdit('Plan made',()=>{B.plan=p;B.stage='plan';B.fromStudio=null},1);B.job=null;const pc=$('[aria-label=Plan]');if(pc)pc.scrollIntoView({block:'start'})},
 ptick:b=>{const B=S.B,s=B.plan.find(x=>x.id===b.dataset.id),v=b.checked,dep=v?[]:dependants(B.plan,B.dest,s.id).map(x=>x.id);
  planEdit((v?'Step on: ':'Step off: ')+TOOL[s.t].n,()=>{B.plan.forEach(x=>{if(x.id===s.id)x.on=v;else if(dep.includes(x.id))x.on=false})},1);
  if(dep.length)T('Also unticked '+dep.length+' step'+(dep.length===1?' that needs':'s that need')+' it',undo)},
 pfix:b=>{const B=S.B,id=b.dataset.id,f=validate(B.plan,B.dest).fix[id];if(!f)return;
  if(f.k==='unl'){A.tunl({dataset:{id:B.plan.find(x=>x.id===id).t}});return}
  planEdit('Fixed a step',()=>{const P=B.plan,i=P.findIndex(x=>x.id===id);
   if(f.k==='rm')B.plan=P.filter(x=>x.id!==id);
   else if(f.k==='tick')P.find(x=>x.id===f.id).on=true;
   else if(f.k==='add')P.splice(i,0,mkStep(f.tool));
   else if(f.k==='move'){const s=P.splice(i,1)[0];P.splice(P.findIndex(x=>x.id===f.after)+1,0,s)}},1)},
 bdest:b=>{const B=S.B,v=b.dataset.v;if(B.dest.kind===v)return;
  planEdit('Destination changed',()=>{B.dest.kind=v;if(B.plan){if(v==='nb')B.plan=B.plan.filter(s=>s.t!=='nb_new');else if(!B.plan.some(s=>s.t==='nb_new'))B.plan.unshift(mkStep('nb_new'))}},1)},
 brun:()=>runBuild(),
 jretry:b=>{const j=S.B.job;if(j)Engine.retry(j,b.dataset.id)},
 jskip:b=>{const j=S.B.job;if(j)Engine.skip(j,b.dataset.id)},
 bstop:()=>{const B=S.B;if(B.job)Engine.stop(B.job);B.job=null;B.stage='plan';render();T('Stopped. Nothing was saved.')},
 bedit:()=>{S.B.stage='plan';S.fx='plan';render()},
 bdiscard:()=>{const B=S.B;planEdit('Discarded the draft',()=>{B.stage='plan'},0)},
 bapply:()=>{const B=S.B,j=B.job;if(!j||j.state!=='preview')return;const dn=Engine.done(j),n=dn.length;
  const e={id:'a'+(++UID),t:'Built “'+j.title+'” with '+n+' step'+(n===1?'':'s'),d:destName(j.dest)+' · '+dn.map(s=>TOOL[s.t].n).slice(0,3).join(', ')+(n>3?'…':''),w:'Just now',ico:'wand',un:false,job:j};
  const outs=(B.fromStudio||[]).filter(k=>dn.some(s=>s.t===STU.find(x=>x[0]===k)[3])).map(k=>({id:'o'+(++UID),k,t:OUTS[k][1],saved:true}));
  S.fx='done';
  commit('Saved “'+j.title+'”',()=>{Engine.commit(j);S.act.unshift(e);e.un=false;S.out.unshift(...outs);B.stage='done'},()=>{Engine.undo(j);S.act=S.act.filter(x=>x!==e);S.out=S.out.filter(o=>!outs.includes(o));B.stage='preview'},1)},
 bundo:()=>{const B=S.B,j=B.job;if(HST.length&&j&&j.applied)undo()},
 bnew:()=>{const B=S.B;B.plan=null;B.stage='idea';B.goal='';B.job=null;B.fromStudio=null;render()},
 actundo:b=>{const a=S.act.find(x=>x.id===b.dataset.id),v=!a.un,j=a.job,B=S.B;
  commit((v?'Undid: ':'Redid: ')+a.t,()=>{a.un=v;if(j){v?Engine.undo(j):Engine.commit(j);if(B.job===j&&(B.stage==='done'||B.stage==='preview'))B.stage=v?'preview':'done'}},()=>{a.un=!v;if(j){v?Engine.commit(j):Engine.undo(j);if(B.job===j&&(B.stage==='done'||B.stage==='preview'))B.stage=v?'done':'preview'}},0)},
 /* Studio: tick several, make one plan */
 make:()=>{},
 stsel:b=>{const k=b.dataset.k,U=S.stu;U.sel=U.sel.includes(k)?U.sel.filter(x=>x!==k):U.sel.concat(k);render()},
 stdest:b=>{S.stu.d.kind=b.dataset.v;render()},
 mksel:()=>{const B=S.B,U=S.stu,n=ticked().length;if(!U.sel.length)return;if(!n){T('Tick a source first');return}
  if(B.stage==='running'){T('A job is running. Stop it or wait for it first.');return}
  const P=stuPlan(),d=stuDest(),names=STU.filter(x=>U.sel.includes(x[0])).map(x=>x[0]==='notes'?'notes':'a '+x[1].toLowerCase());
  B.goal='Make '+listWords(names)+' from my '+n+' ticked source'+(n===1?'':'s');S.tab='build';B.view='build';S.fx='plan';
  planEdit('Plan made from Studio',()=>{B.plan=P;B.dest=d;B.stage='plan';B.fromStudio=U.sel.slice()},1);B.job=null;$('#main').scrollTop=0},
 /* Workflows: the filter bar */
 wmore:()=>{S.W.more=!S.W.more;render()},
 wjt:b=>{const W=S.W,v=b.dataset.v;W.jt=W.jt.includes(v)?W.jt.filter(x=>x!==v):W.jt.concat(v);render()},
 wai:b=>{const W=S.W,v=b.dataset.v;W.ai=W.ai.includes(v)?W.ai.filter(x=>x!==v):W.ai.concat(v);render()},
 wstar:b=>{S.W.star=+b.dataset.v;render()},wuses:b=>{S.W.uses=+b.dataset.v;render()},
 wtags:()=>{S.tq='';fpop('[data-a=wtags]','Tags',tagPicker)},
 wsort:()=>fpop('[data-a=wsort]','Sort by',sortPicker),
 fpx:()=>fpopClose(),
 tpick:b=>{const W=S.W,v=b.dataset.v;W.tags=b.checked?W.tags.concat(v):W.tags.filter(x=>x!==v);render();fpopDraw()},
 tmode:b=>{S.W.tmode=b.dataset.v;render();fpopDraw()},
 tpclear:()=>{S.W.tags=[];render();fpopDraw()},
 sortpick:b=>{S.W.sort=b.dataset.v;fpopClose();render()},
 wchip:b=>{const W=S.W,k=b.dataset.k,v=b.dataset.v;if(k==='q')W.q='';else if(k==='tmode')W.tmode='any';else if(k==='star'||k==='uses')W[k]=0;else W[k]=W[k].filter(x=>x!==v);render()},
 wclear:()=>{Object.assign(S.W,JSON.parse(JSON.stringify(WF0)),{sort:S.W.sort});render()},
 wview:b=>{const v=S.wviews.find(x=>x.id===b.dataset.v);Object.assign(S.W,JSON.parse(JSON.stringify(Object.assign({},WF0,v?v.f:{}))));render()},
 wsave:()=>Shell.ask('Name this view','',n=>{if(!n)return;const v={id:'v'+(++UID),n:n.slice(0,30),f:wfF()};commit('Saved the view “'+v.n+'”',()=>S.wviews.push(v),()=>S.wviews=S.wviews.filter(x=>x!==v),1)}),
 wvrm:b=>{const v=S.wviews.find(x=>x.id===b.dataset.v),i=S.wviews.indexOf(v);commit('Deleted the view “'+v.n+'”',()=>S.wviews.splice(i,1),()=>S.wviews.splice(i,0,v),0)},
 /* quick panel: same checker and engine, the page is the destination */
 qplan:()=>{const g=QP.goal.trim();if(!g){T('Describe the change first');return}QP.plan=makePlan(g,true);QP.stage='plan';QP.job=null;qpDraw()},
 qrun:()=>{const P=QP.plan;if(!actN(P))return;const d={kind:'page'},v=validate(P,d);if(!v.ok){T(Object.values(v.errs)[0]);return}CUR=P;
  guard('build','Change this page',()=>{const j=Engine.start({title:'This page',plan:P,dest:d,fail:false,onChange:fin=>{if(QP.job!==j)return;
    if(fin&&QP.stage==='running'){const A2=Engine.done(j),e={id:'a'+(++UID),t:'Changed this page: “'+QP.goal.slice(0,48)+'”',d:A2.map(s=>TOOL[s.t].n).slice(0,3).join(', ')+(A2.length>3?'…':''),w:'Just now',ico:'wand',un:false,job:j};
     commit('Page changed',()=>{Engine.commit(j);S.act.unshift(e);QP.stage='done'},()=>{Engine.undo(j);S.act=S.act.filter(x=>x!==e);QP.stage='plan'},1)}
    else if(qpOpen)qpDraw()}});
   if(!j)return;QP.job=j;QP.stage='running';Engine.pump(j)});CUR=null}
});
document.addEventListener('input',e=>{const t=e.target,id=t.id;
 if(id==='bname')S.B.dest.name=t.value;else if(id==='stname')S.stu.d.name=t.value;
 else if(id==='tpq'){S.tq=t.value;fpopDraw()}});
document.addEventListener('change',e=>{const t=e.target,id=t.id;
 if(id==='bnb')S.B.dest.nb=t.value;else if(id==='bsec')S.B.dest.sec=t.value;else if(id==='stnb')S.stu.d.nb=t.value;else if(id==='stsec')S.stu.d.sec=t.value;else if(id!=='bname'&&id!=='stname')return;
 render()});
document.addEventListener('pointerdown',e=>{if(FP&&!e.target.closest('#fpop')&&!e.target.closest(FP.sel))fpopClose()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&FP){e.stopImmediatePropagation();fpopClose()}},true);

