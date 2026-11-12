// one-off patch: previews for Pressure, Shadow and the lasso menu switches
const fs=require('fs');const D=__dirname+'/';
let s=fs.readFileSync(D+'v8b.js','utf8');
const r=(a,b)=>{if(!s.includes(a))throw new Error('miss '+a.slice(0,50));s=s.replace(a,b)};
r(" [/custom tools/i,"," [/^pressure$/i,on=>on?'<path class=\"af\" d=\"M3 10c5-1 8-5 13-5s8 4 13 5c-5 1-8 5-13 5S8 11 3 10z\"/>':'<path d=\"M3 10h26\"/>'],\n [/^shadow$/i,on=>(on?'<rect class=\"f d\" x=\"9\" y=\"6\" width=\"18\" height=\"12\" rx=\"2.5\"/>':'')+'<rect x=\"6\" y=\"3\" width=\"18\" height=\"12\" rx=\"2.5\" style=\"fill:var(--pv-fill)\"'+(on?' class=\"a\"':'')+'/>'],\n [/custom tools/i,");
r("function v8Minis(root){if(!root)return;$$('[role=switch]',root).forEach(s=>{const lab=v8SwLabel(s),m=V8MINI.find(x=>x[0].test(lab));if(!m)return;","const V8ICON={Copy:'copy',Cut:'scissors',Duplicate:'dup','Convert to text':'typeic',Colour:'palette',Delete:'trash',Thickness:'sliders','Make card':'stack','Add to Summary':'anchor','Name this drawing':'pencil'};\nfunction v8Minis(root){if(!root)return;$$('[role=switch]',root).forEach(s=>{const lab=v8SwLabel(s),ic=s.closest('#lcard')&&V8ICON[lab],m=ic?[0,()=>'']:V8MINI.find(x=>x[0].test(lab));if(!m)return;");
r("pv.innerHTML='<svg viewBox=\"0 0 32 20\">'+m[1](on)+'</svg>';","pv.innerHTML=ic?svg(ic).replace('<svg','<svg class=\"ic\"'):'<svg viewBox=\"0 0 32 20\">'+m[1](on)+'</svg>';");
fs.writeFileSync(D+'v8b.js',s);
let c=fs.readFileSync(D+'v8.css','utf8');const k="[aria-checked=true]>.v8pv,";if(!c.includes(k))throw new Error('css');
c=c.replace(k,".v8pv svg.ic{width:17px;height:17px;stroke-width:1.7}\n[aria-checked=true]>.v8pv svg.ic{color:var(--accent)}[aria-checked=false]>.v8pv svg.ic{opacity:.45}\n"+k);fs.writeFileSync(D+'v8.css',c);
console.log('patched');
