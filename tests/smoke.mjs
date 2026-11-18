import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(fs.readFileSync('public/index.html','utf8'), { runScripts:'outside-only', url:'http://localhost:5173/', pretendToBeVisual:true });
const { window } = dom;
const ctxStub = new Proxy({}, { get:(t,p)=> p in t ? t[p] : ()=>{}, set:(t,p,v)=>{t[p]=v;return true;} });
window.HTMLCanvasElement.prototype.getContext = () => ctxStub;

// geometría sintética: 3 corredores reales aproximados
const FC = {
  type:'FeatureCollection',
  features: [
    { type:'Feature', properties:{ID_MT:'4'}, geometry:{type:'MultiLineString',coordinates:[[[-75.62,5.72],[-75.60,5.52],[-75.66,5.26],[-75.87,4.90]]]} },
    { type:'Feature', properties:{ID_MT:'20'}, geometry:{type:'MultiLineString',coordinates:[[[-77.30,1.20],[-77.20,1.10],[-77.10,1.05]]]} },
    { type:'Feature', properties:{ID_MT:'2'}, geometry:{type:'MultiLineString',coordinates:[[[-75.58,8.42],[-75.39,8.10],[-75.23,8.00],[-75.77,8.64],[-75.81,9.22]]]} },
    { type:'Feature', properties:{COD_PR_IRE:'F-01'}, geometry:{type:'MultiLineString',coordinates:[[[-74.20,11.24],[-74.00,10.50],[-73.70,9.90]]]} },
  ],
};
const ATRIB = { features: [
  {attributes:{ID_MT:'4',NOMBRE:'Autopista Conexión Pacífico 2',GEN:'4G',OLA_4G:'Ola 1',ESTADO:'Operación'}},
  {attributes:{ID_MT:'20',NOMBRE:'Rumichaca - Pasto',GEN:'4G',OLA_4G:'Ola 2',ESTADO:'Operación'}},
  {attributes:{ID_MT:'2',NOMBRE:'IP - Antioquia - Bolívar',GEN:'4G',OLA_4G:'IP',ESTADO:'Construcción'}},
]};

let llamadas = 0;
window.fetch = async (url) => {
  url = String(url);
  llamadas++;
  if (url.includes('/data/')) return { ok:true, json: async()=> JSON.parse(fs.readFileSync('data/'+url.split('/data/')[1],'utf8')) };
  if (url.includes('returnCountOnly')) return { ok:true, json: async()=>({count: FC.features.length}) };
  if (url.includes('returnGeometry=false') && url.includes('outFields=ID_MT')) return { ok:true, json: async()=>ATRIB };
  if (url.includes('resultOffset')) {
    const off = Number(new URL(url).searchParams.get('resultOffset'));
    const n = Number(new URL(url).searchParams.get('resultRecordCount'));
    return { ok:true, json: async()=>({ type:'FeatureCollection', features: FC.features.slice(off, off+n) }) };
  }
  if (url.includes('Modos_ANI/FeatureServer/2')) return { ok:true, json: async()=>({ type:'FeatureCollection', features:[] }) };
  if (url.includes('Modos_ANI/FeatureServer/4')) return { ok:true, json: async()=>({ type:'FeatureCollection', features:[] }) };
  return { ok:false, json: async()=>({}) };
};

const errores = [];
window.addEventListener('error', e => errores.push(String(e.message).slice(0,200)));
window.eval(fs.readFileSync('public/assets/leaflet.js','utf8'));
window.eval(fs.readFileSync('public/assets/app.js','utf8'));
await new Promise(r=>setTimeout(r,2000));
const d = window.document;
console.log('errores:', errores.slice(0,3));
console.log('status:', d.getElementById('status-text').textContent.slice(0,160));
console.log('listo:', d.body.dataset.listo, 'llamadas:', llamadas);
const items = [...d.querySelectorAll('.item')];
console.log('items con trazado:', items.filter(i=>!i.textContent.includes('sin trazado')).map(i=>i.dataset.id));
// seleccionar Pacífico 2
const it = items.find(i=>i.dataset.id==='4');
it.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
await new Promise(r=>setTimeout(r,600));
const det = d.getElementById('detail');
console.log('detalle visible:', !det.classList.contains('hidden'));
const txt = det.textContent.replace(/\s+/g,' ').trim();
console.log('detalle:', txt.slice(0,420));
console.log('municipios chips:', det.querySelectorAll('.municipios .m').length);
// clic en el mapa (simulado por evento de leaflet)

// clic en el mapa: punto cerca de Pacífico 2 (Cali-ish)
window.__ani.map.fire('click', { latlng: window.L.latLng(5.52, -75.60) });
await new Promise(r=>setTimeout(r,300));
console.log('point-card:', d.getElementById('point-card').classList.contains('hidden') ? 'oculto' : 'visible');
console.log('point-body:', d.getElementById('point-body').textContent.replace(/\s+/g,' ').trim().slice(0,260));

// filtros y export
d.getElementById('f-gen').value = '1G';
d.getElementById('f-gen').dispatchEvent(new window.Event('change'));
console.log('filtro 1G ->', d.querySelectorAll('.item').length);
d.getElementById('q').value = 'pacifico';
d.getElementById('q').dispatchEvent(new window.Event('input'));
await new Promise(r=>setTimeout(r,300));
console.log('busqueda pacifico ->', d.querySelectorAll('.item').length);
console.log('__ani:', typeof window.__ani.municipiosDe);
