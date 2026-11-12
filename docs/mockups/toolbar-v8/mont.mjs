// node mont.mjs <dir> <out.png> <zoom> files...   (tiles full screenshots 2 per row)
import fs from 'fs';import { chromium } from 'file:///C:/Users/pc/Downloads/learning-notes/node_modules/playwright/index.mjs';
const D='C:/Users/pc/AppData/Local/Temp/claude/4d2a322303203713/e6354cc9-3f84-4a5e-9756-7304491d5da4/scratchpad/v8/';
const [dir,out,z,...files]=process.argv.slice(2);
fs.writeFileSync(D+'_montage.html','<body style="margin:0;background:#333;display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start">'+files.map(f=>'<figure style="margin:0;position:relative"><img src="'+dir+'/'+f+'.png" style="display:block;zoom:'+z+'"><figcaption style="position:absolute;left:4px;bottom:2px;color:#ff0;font:13px sans-serif;background:#000c">'+f+'</figcaption></figure>').join('')+'</body>');
const b=await chromium.launch();const p=await b.newPage({viewport:{width:+(process.env.W||1900),height:1000}});
await p.goto('file:///'+D+'_montage.html');await p.waitForTimeout(500);await p.screenshot({path:D+out,fullPage:true});await b.close();
