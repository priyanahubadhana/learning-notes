const fs=require('fs');const D=__dirname+'/';
const rep=(f,a,b)=>{let s=fs.readFileSync(D+f,'utf8');if(!s.includes(a))throw new Error(f+' miss '+a.slice(0,40));s=s.split(a).join(b);fs.writeFileSync(D+f,s)};
rep('v8c.js',"\nrenderToolbar();\n","\n");
rep('v8c.js',"if(!ST.ct.unlock)CT.edit=false;renderToolbar();if(MC.open)renderMore();rerender()}","if(!ST.ct.unlock)CT.edit=false;renderToolbar();if(MC.open)renderMore();rerender();const on=ST.ct.unlock;v8Toast('Custom tools turned '+(on?'on':'off'),()=>{ST.ct.unlock=!on;save();renderToolbar();if(MC.open)renderMore();rerender();toast('Custom tools '+(on?'are off again':'are on again'))})}");
rep('v8.css',"min-width:44px;max-width:150px;margin:3px 1px;","min-width:44px;margin:3px 1px;");
rep('v8.css',".v8ct>.nm{overflow:hidden;text-overflow:ellipsis}\n","");
console.log('ok');
