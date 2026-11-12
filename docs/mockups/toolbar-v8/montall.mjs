// tiles every screenshot in a folder, 4 per sheet: node v8/montall.mjs <dir> [zoom] [prefix]
import fs from 'fs';import { chromium } from 'file:///C:/Users/pc/Downloads/learning-notes/node_modules/playwright/index.mjs';
const D='C:/Users/pc/AppData/Local/Temp/claude/4d2a322303203713/e6354cc9-3f84-4a5e-9756-7304491d5da4/scratchpad/v8/';
const dir=process.argv[2],z=process.argv[3]||'0.8',pre=process.argv[4]||'';
const files=fs.readdirSync(D+dir).filter(f=>f.endsWith('.png')&&f.startsWith(pre)).sort();
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1900,height:1000}});
for(let i=0,n=1;i<files.length;i+=4,n++){
 fs.writeFileSync(D+'_montage.html','<body style="margin:0;background:#333;display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start">'+files.slice(i,i+4).map(f=>'<figure style="margin:0;position:relative"><img src="'+dir+'/'+f+'" style="display:block;zoom:'+z+'"><figcaption style="position:absolute;left:4px;bottom:2px;color:#ff0;font:13px sans-serif;background:#000c">'+f+'</figcaption></figure>').join('')+'</body>');
 await p.goto('file:///'+D+'_montage.html');await p.waitForTimeout(400);await p.screenshot({path:D+'_m'+dir.replace(/\W/g,'')+pre.replace(/\W/g,'')+n+'.png',fullPage:true})}
console.log('sheets',Math.ceil(files.length/4));await b.close();
