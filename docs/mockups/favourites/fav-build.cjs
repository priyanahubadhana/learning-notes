// Builds favourites-bar-mock.html = toolbar-mock-v8.html (unchanged) + fav CSS + fav.js. Re-runnable.
const fs=require('fs');const D=__dirname+'/';let h=fs.readFileSync(D+'toolbar-mock-v8.html','utf8');
const css=fs.readFileSync(D+'fav.css','utf8');
const i=h.lastIndexOf('</style>');h=h.slice(0,i)+css+h.slice(i);
h=h.replace('<title>Toolbar Mock-up v8</title>','<title>Favourites bar mock-up</title>').replace('Toolbar mock-up v8</span>','Favourites bar mock-up</span>').replace("const KEY='tbmock.v8';","const KEY='tbmock.fav1';");
const j=h.lastIndexOf('</script>');h=h.slice(0,j+9)+'\n<script>\n'+fs.readFileSync(D+'fav.js','utf8')+'\n</script>'+h.slice(j+9);
fs.writeFileSync(D+'favourites-bar-mock.html',h);console.log('ok',h.length);
