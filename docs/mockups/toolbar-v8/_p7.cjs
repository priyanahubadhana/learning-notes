const fs=require('fs');const D=__dirname+'/';
const rep=(f,a,b)=>{let s=fs.readFileSync(D+f,'utf8');if(!s.includes(a))throw new Error(f+' miss '+a.slice(0,40));s=s.split(a).join(b);fs.writeFileSync(D+f,s)};
// tight rows: custom tools first lose their name (the picture stays, one tap stays), only then fold into "⋯ n"
rep('v8c.js',"const over=()=>measure.scrollWidth>measure.clientWidth+1;\n","const over=()=>measure.scrollWidth>measure.clientWidth+1;if(over()&&cts.length)host.classList.add('v8tight');\n");
rep('v8.css',"/* edit mode */",".v8tight .v8ct>.nm{display:none}.v8tight .v8ct{padding:0 6px}\n/* edit mode: the row's own ▾ buttons step back to icons so the custom tools have room */\n.v8editing .v6b:not(.v8ct)>span:not([class]),.v8editing .v6b:not(.v8ct)>.cv,.v8editing .v6b:not(.v8ct)>.lab{display:none}\n@media (max-width:900px){.v8hint{display:none}}");
rep('v8.css',".v8hint{flex:0 1 auto;min-width:0;",".v8hint{flex:0 1 auto;min-width:0;text-align:right;");
console.log('ok');
