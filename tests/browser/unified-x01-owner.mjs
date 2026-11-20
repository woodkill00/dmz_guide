import {chromium,firefox,webkit} from 'playwright';
import {runX01WorkbenchBrowser} from '../../tools/hajin-map/tests/x01-workbench-browser.mjs';
for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch();
 try{await runX01WorkbenchBrowser(browser,'http://127.0.0.1:4173/map');console.log(name+' integrated X01 owner workflow passed');}
 finally{await browser.close();}
}
