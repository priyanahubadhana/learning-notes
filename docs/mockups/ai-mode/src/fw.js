/* ===== v4: the tool framework, a small in-page copy of docs/design/ai-tool-framework.md =====
   REGISTRY (what each tool needs, makes, where it writes, cost, undo, risk) → VALIDATE (a plan cannot run with an error)
   → EXECUTE (stage each step, retry with backoff, pause on failure: Retry / Skip / Stop; nothing is written yet)
   → COMMIT (all or nothing, same ids if repeated) → UNDO (takes the whole job back). */
const GDEF={Notebooks:{needs:['notebook'],w:'Notebook'},Pages:{needs:['page'],w:'Notes tab'},Tabs:{needs:['page'],w:'Page tabs'},Summaries:{needs:['page'],w:'Summary tab'},'Mind maps':{needs:['map'],w:'Mind map tab'},Cards:{needs:['cards'],w:'Cards deck'},Databases:{needs:['database'],w:'Database'},Styles:{needs:['page'],w:'Page style'},Layouts:{needs:['page'],w:'Notes tab'},Tags:{needs:['page'],w:'Tags'},Library:{needs:[],w:'Library'},'Home widgets':{needs:[],w:'Home'},Search:{needs:['notebook'],w:'Search'},Review:{needs:['cards'],w:'Review'},'Import and export':{needs:[],w:'Library'}};
const MOV={nb_new:{needs:[],gives:['notebook'],cost:'none',undo:'batch'},nb_section:{gives:['section'],cost:'none',undo:'batch'},nb_cover:{cost:'none',undo:'values'},nb_merge:{risk:'inbox'},
 pg_add:{needs:['notebook'],gives:['page'],cost:'medium',undo:'batch'},pg_tpl:{needs:['notebook'],gives:['page'],undo:'batch'},pg_refine:{cost:'medium'},pg_split:{risk:'inbox'},pg_join:{risk:'inbox'},pg_order:{needs:['notebook'],cost:'none',undo:'values'},pg_dup:{cost:'none',undo:'batch'},
 tab_add:{cost:'none',undo:'batch'},tab_name:{cost:'none',undo:'values'},tab_order:{cost:'none',undo:'values'},tab_default:{needs:[],cost:'none',undo:'values'},
 sum_tab:{undo:'batch'},map_new:{needs:['page'],gives:['map'],cost:'medium',undo:'batch'},
 cards_new:{needs:['page'],gives:['cards'],undo:'batch'},cards_cloze:{needs:['page'],gives:['cards'],undo:'batch'},cards_quiz:{needs:['page'],gives:['cards'],undo:'batch'},
 db_new:{needs:['page'],gives:['database'],undo:'batch'},style_apply:{cost:'none',undo:'values'},hd_style:{cost:'none',undo:'values'},style_theme:{needs:['notebook'],undo:'values'},
 layout_cols:{cost:'none'},layout_move:{cost:'none'},find_replace:{risk:'inbox'},find_save:{needs:[],cost:'none',undo:'batch'},rev_weak:{needs:[]},rev_remind:{needs:[],cost:'none',undo:'batch'},
 io_export:{needs:['notebook'],w:'A file',cost:'none',undo:'batch'},io_share:{needs:['notebook'],w:'A file',cost:'none',undo:'batch'},lib_add:{undo:'batch'},io_pdf:{undo:'batch'},io_link:{undo:'batch'},io_bulk:{undo:'batch'},home_widget:{undo:'batch',cost:'none'},home_plan:{undo:'batch',cost:'none'},home_tpl:{undo:'batch'}};
TOOLS.forEach(t=>{const g=GDEF[t.g],o=MOV[t.id]||{};Object.assign(t,{needs:o.needs||g.needs,gives:o.gives||[],w:o.w||g.w,cost:o.cost||'small',undo:o.undo||'history',risk:o.risk||'direct'})});
const KIND={notebook:'a notebook',page:'a notes page',map:'a mind map',cards:'cards',database:'a database',section:'a section'};
const PROVIDER={notebook:'nb_new',page:'pg_add',map:'map_new',cards:'cards_new',database:'db_new',section:'nb_section'};
const COSTW={none:'Free · no AI needed',small:'Small',medium:'Medium',large:'Large'};
const UNDOW={batch:'Removes what it made',history:'Puts the page back from its History',values:'Puts the old settings back'};
const tdet=t=>'<dl class="tdet"><dt>Needs first</dt><dd>'+(t.needs.length?t.needs.map(k=>KIND[k]).join(', '):'Nothing')+'</dd><dt>Makes</dt><dd>'+(t.gives.length?t.gives.map(k=>KIND[k]).join(', '):'A change, nothing new')+'</dd><dt>Writes to</dt><dd>'+esc(t.w)+'</dd><dt>AI cost</dt><dd>'+COSTW[t.cost]+'</dd><dt>Undo</dt><dd>'+UNDOW[t.undo]+'</dd><dt>Approval</dt><dd>'+(t.risk==='inbox'?'Always waits in your Inbox':'Preview, then Apply')+'</dd></dl>';
/* destination: where the job writes */
const destHas=d=>d.kind==='page'?['notebook','page']:d.kind==='nb'?['notebook']:[];
const destName=d=>d.kind==='new'?((d.name||'').trim()||'New notebook'):d.kind==='page'?'This page':d.nb+(d.sec?' › '+d.sec:'');
const place=(d,t)=>t.id==='nb_new'?'Notebooks › '+destName(d):/^(Library|Home|A file)$/.test(t.w)?t.w:destName(d)+' › '+t.w;
/* VALIDATE: pure. Returns one plain error per broken step, a one-tap fix, and what each step depends on. */
function validate(P,dest){const errs={},fix={},deps={},prov={},have=new Set(destHas(dest)),on=(P||[]).filter(s=>s.on);let nb=0;
 on.forEach((s,i)=>{const t=TOOL[s.t];deps[s.id]=[];const bad=(m,f)=>{if(!errs[s.id]){errs[s.id]=m;fix[s.id]=f}};
  if(!t){bad('This tool is not in the catalog.',{k:'rm',l:'Remove'});return}
  if(isLocked(s.t))bad('This is a locked Professional tool.',{k:'unl',l:'Unlock'});
  if(s.t==='nb_new'){if(dest.kind!=='new')bad('You chose a notebook you already have, so this step is not needed.',{k:'rm',l:'Remove'});else if(++nb>1)bad('A job makes one notebook.',{k:'rm',l:'Remove'})}
  t.needs.forEach(k=>{if(have.has(k)){if(prov[k])deps[s.id].push(prov[k]);return}
   const later=on.slice(i+1).find(x=>TOOL[x.t]&&TOOL[x.t].gives.includes(k)),off=(P||[]).find(x=>!x.on&&TOOL[x.t]&&TOOL[x.t].gives.includes(k));
   if(later)bad('Needs '+KIND[k]+' first. It must come after “'+TOOL[later.t].n+'”.',{k:'move',after:later.id,l:'Move it down'});
   else if(off)bad('Needs “'+TOOL[off.t].n+'”, which is unticked.',{k:'tick',id:off.id,l:'Tick it'});
   else bad('Needs '+KIND[k]+' first.',{k:'add',tool:PROVIDER[k],l:'Add “'+TOOL[PROVIDER[k]].n+'”'})});
  t.gives.forEach(k=>{if(!have.has(k)||!prov[k]){have.add(k);prov[k]=s.id}})});
 const n=Object.keys(errs).length;return{ok:!n&&on.length>0,errs,fix,deps,n}}
/* everything that depends on a step, directly or through another step */
function dependants(P,dest,id){const v=validate(P,dest),set=new Set([id]),out=[];P.filter(s=>s.on).forEach(s=>{if((v.deps[s.id]||[]).some(d=>set.has(d))){set.add(s.id);out.push(s)}});return out}
/* the mock's saved notes: Apply writes here, Undo takes it back */
const DB={nbs:NBS.map((n,i)=>({id:'n'+i,name:n})),recs:[]};
const nbNames=()=>DB.nbs.map(n=>n.name);
const DUR={none:260,small:520,medium:780,large:1000};
const Engine={
 start(o){const v=validate(o.plan,o.dest);if(!v.ok)return null;
  const steps=o.plan.filter(s=>s.on).map(s=>({id:s.id,t:s.t,d:s.d,deps:v.deps[s.id],state:'wait',tries:0,ms:0,err:'',wait:0,where:place(o.dest,TOOL[s.t])}));
  const j={id:'job'+(++UID),title:o.title,dest:Object.assign({},o.dest),steps,state:'running',timer:null,failId:null,failLeft:0,onChange:o.onChange,applied:false,last:null};
  if(o.fail){const f=steps.find(s=>s.t==='map_new')||steps[Math.min(2,steps.length-1)];if(f&&steps.indexOf(f)>0){j.failId=f.id;j.failLeft=3}}
  return j},
 pump(j){clearTimeout(j.timer);if(j.state==='stopped')return;
  if(S.demo==='off'){j.state='offline';j.onChange();return}
  const s=j.steps.find(x=>x.state==='wait');
  if(!s){j.state='preview';j.onChange(true);return}
  if(s.deps.some(d=>{const x=j.steps.find(y=>y.id===d);return x&&(x.state==='skip'||x.state==='blocked')})){s.state='blocked';return this.pump(j)}
  s.state='run';s.tries++;j.state='running';const t1=Date.now();j.onChange();
  j.timer=setTimeout(()=>{s.ms+=Date.now()-t1;
   if(j.failId===s.id&&j.failLeft>0){j.failLeft--;s.err='The AI did not answer in time.';
    if(s.tries<3){s.state='retry';s.wait=s.tries===1?1:2;j.onChange();j.timer=setTimeout(()=>{s.state='wait';this.pump(j)},s.wait*900);return}  /* backoff: wait longer each time */
    s.state='fail';j.state='attention';j.onChange();return}
   s.state='done';s.err='';j.last=s.id;setTimeout(()=>{if(j.last===s.id)j.last=null},500);this.pump(j)},DUR[TOOL[s.t].cost])},
 retry(j,id){const s=j.steps.find(x=>x.id===id);if(!s)return;s.state='wait';s.tries=0;s.err='';this.pump(j)},
 skip(j,id){const s=j.steps.find(x=>x.id===id);if(!s)return;s.state='skip';this.pump(j)},
 willBlock(j,id){const set=new Set([id]),out=[];j.steps.forEach(x=>{if(x.deps.some(d=>set.has(d))){set.add(x.id);out.push(x)}});return out},
 stop(j){clearTimeout(j.timer);j.state='stopped'},
 done:j=>j.steps.filter(s=>s.state==='done'),
 /* all or nothing; record ids come from the job and step, so applying twice cannot make copies */
 commit(j){if(j.applied)return;const recs=this.done(j).map(s=>({id:j.id+'.'+s.id,job:j.id,t:s.t,n:TOOL[s.t].n,where:s.where}));
  if(recs.some(r=>r.t==='nb_new'))DB.nbs.push({id:j.id,name:destName(j.dest),job:j.id});
  DB.recs=DB.recs.filter(r=>r.job!==j.id).concat(recs);j.applied=true},
 undo(j){if(!j.applied)return;DB.recs=DB.recs.filter(r=>r.job!==j.id);DB.nbs=DB.nbs.filter(n=>n.job!==j.id);j.applied=false},
 saved:j=>DB.recs.filter(r=>r.job===j.id)};
const jobDetail=j=>'<div class="well jd">'+j.steps.map(s=>'<div class="jdr"><span>'+esc(TOOL[s.t].n)+'</span><small>'+({done:'Done',skip:'Skipped',blocked:'Skipped',fail:'Failed'}[s.state]||'Not run')+(s.tries>1?' · '+s.tries+' tries':'')+(s.ms?' · '+(s.ms/1000).toFixed(1)+' s':'')+'</small></div>').join('')+'<div class="jdr"><span>Run from</span><small>The app · '+esc(chipLabel())+' · ₹0</small></div></div>';
