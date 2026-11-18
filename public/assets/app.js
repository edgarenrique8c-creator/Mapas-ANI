(()=>{var O={carretero:"https://services8.arcgis.com/qXzQm8c8qEBxS81s/arcgis/rest/services/OpenDataAni/FeatureServer/3",ferreo:"https://services8.arcgis.com/qXzQm8c8qEBxS81s/arcgis/rest/services/Modos_ANI/FeatureServer/2",fluvial:"https://services8.arcgis.com/qXzQm8c8qEBxS81s/arcgis/rest/services/Modos_ANI/FeatureServer/4"},_="ani-geom-v5",ne=1e3*60*60*24*3,U=8;async function $(e,{timeout:t=3e4}={}){let o=new AbortController,n=setTimeout(()=>o.abort(),t);try{let a=await fetch(e,{signal:o.signal,mode:"cors",credentials:"omit"});if(!a.ok)throw new Error(`HTTP ${a.status}`);return await a.json()}finally{clearTimeout(n)}}var j={outSR:"4326",f:"geojson",geometryPrecision:"4",maxAllowableOffset:"0.02"};function S(e){return new URLSearchParams(e).toString()}function ae(e,t){let o=111320*Math.cos((e[1]+t[1])/2*(Math.PI/180)),n=(t[0]-e[0])*o,a=(t[1]-e[1])*110540;return Math.sqrt(n*n+a*a)}function H(e){if(!e)return[];let t=[];e.type==="LineString"?t=[e.coordinates]:e.type==="MultiLineString"||e.type==="Polygon"?t=e.coordinates:e.type==="MultiPolygon"&&(t=e.coordinates.flat());let o=[];for(let n of t){let a=[],i=0;for(let s of n){if(!Array.isArray(s)||s.length<2)continue;let r=Number(s[0]),u=Number(s[1]);if(!Number.isFinite(r)||!Number.isFinite(u)||r<-85||r>-66||u<-5||u>14.5)continue;let d=[r,u],c=a[a.length-1];if(c){let f=ae(c,d);if(f<30)continue;i+=f}a.push(d)}a.length>1&&i>200&&o.push(a)}return o}function ie(){try{let e=localStorage.getItem(_);if(!e)return null;let t=JSON.parse(e);return!t.ts||Date.now()-t.ts>ne?null:t.data}catch{return null}}function re(e){try{localStorage.setItem(_,JSON.stringify({ts:Date.now(),data:e}))}catch{}}async function R(e,t=3){let o;for(let n=0;n<t;n+=1)try{return await e()}catch(a){o=a,n<t-1&&await new Promise(i=>setTimeout(i,600*(n+1)))}throw o}async function se(){let e=`${O.carretero}/query?${S({where:"1=1",outFields:"ID_MT,NOMBRE,GEN,OLA_4G,ESTADO",returnGeometry:"false",orderByFields:"ID_MT",f:"json"})}`,t=await $(e),o=new Map;for(let n of t.features||[]){let a=n.attributes||{};o.set(String(a.ID_MT),a)}return o}async function ce(e){let t=[],o=0,n=null;try{n=(await $(`${O.carretero}/query?${S({where:"1=1",returnCountOnly:"true",f:"json"})}`)).count}catch{n=47}for(;o<(n!=null?n:47);){let a=`${O.carretero}/query?${S({...j,where:"1=1",outFields:"ID_MT",orderByFields:"OBJECTID",resultOffset:String(o),resultRecordCount:String(U)})}`,s=(await R(()=>$(a))).features||[];if(t.push(...s),o+=s.length||U,e&&e(Math.min(o,n||o),n||o),!s.length)break}return t}function B(e,t){let o=[];return(e.features||[]).forEach((n,a)=>{let i=H(n.geometry);i.length&&o.push({uid:`${t}-${a}`,props:n.properties||{},lineas:i,tipo:t})}),o}async function K({onProgress:e=()=>{},force:t=!1}={}){if(!t){let r=ie();if(r)return e({fase:"cache"}),{...r,fuente:"cache",errores:[]}}let o=[],n=[],a=[],i=[];try{let r=await R(se);n=(await ce((d,c)=>e({fase:"carretero",hechos:d,total:c}))).map(d=>{let c=String((d.properties||{}).ID_MT||""),f=r.get(c)||{};return{uid:`c-${c}`,props:{...f,ID_MT:c},lineas:H(d.geometry),tipo:"Carretero"}}).filter(d=>d.lineas.length)}catch(r){o.push(`carretero: ${r.message}`)}e({fase:"ferreo"});try{let r=await R(()=>$(`${O.ferreo}/query?${S({...j,where:"1=1",outFields:"*"})}`));a=B(r,"F\xE9rreo")}catch(r){o.push(`f\xE9rreo: ${r.message}`)}e({fase:"fluvial"});try{let r=await R(()=>$(`${O.fluvial}/query?${S({...j,where:"1=1",outFields:"*"})}`));i=B(r,"Fluvial")}catch(r){o.push(`fluvial: ${r.message}`)}let s={carretero:n,ferreo:a,fluvial:i};if(!n.length&&!a.length&&!i.length){let r=new Error(o.join(" \xB7 ")||"sin datos");throw r.allFailed=!0,r}return re(s),{...s,fuente:"red",errores:o}}var le=63710088e-1;function de(e,t){let o=Math.PI/180,n=(t[1]-e[1])*o,a=(t[0]-e[0])*o,i=e[1]*o,s=t[1]*o,r=Math.sin(n/2)**2+Math.cos(i)*Math.cos(s)*Math.sin(a/2)**2;return 2*le*Math.asin(Math.min(1,Math.sqrt(r)))}function ue(e,t,o){let n=(t[1]+o[1])/2*(Math.PI/180),a=111320*Math.cos(n),i=110540,s=(e[0]-t[0])*a,r=(e[1]-t[1])*i,u=(o[0]-t[0])*a,d=(o[1]-t[1])*i,c=u*u+d*d,f=c===0?0:(s*u+r*d)/c;f=Math.max(0,Math.min(1,f));let b=s-u*f,y=r-d*f;return Math.sqrt(b*b+y*y)}function Z(e,t){let o=1/0,n=0;for(let a=1;a<t.length;a+=1){let i=ue(e,t[a-1],t[a]);i<o&&(o=i,n=a)}return{dist:o,idx:n}}function V(e,t){let[o,n]=e,a=!1;for(let i=0,s=t.length-1;i<t.length;s=i,i+=1){let r=t[i][0],u=t[i][1],d=t[s][0],c=t[s][1];u>n!=c>n&&o<(d-r)*(n-u)/(c-u)+r&&(a=!a)}return a}function pe(e,t){if(!V(e,t[0]))return!1;for(let o=1;o<t.length;o+=1)if(V(e,t[o]))return!1;return!0}function fe(e){let t=1/0,o=1/0,n=-1/0,a=-1/0,i=s=>{if(typeof s[0]=="number"){s[0]<t&&(t=s[0]),s[0]>n&&(n=s[0]),s[1]<o&&(o=s[1]),s[1]>a&&(a=s[1]);return}s.forEach(i)};return i(e.coordinates),[t,o,n,a]}function z(e){return e.features.map(t=>({props:t.properties,geom:t.geometry,box:fe(t.geometry)}))}function q(e,t){let[o,n]=t;for(let a of e){let[i,s,r,u]=a.box;if(o<i||o>r||n<s||n>u)continue;let d=a.geom,c=d.type==="Polygon"?[d.coordinates]:d.coordinates;for(let f of c)if(pe([o,n],f))return a.props}return null}function A(e){return(e||"").toString().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g," ").trim()}var me={8:["AUTOPISTA AL RIO MAGDALENA 2","RIO MAGDALENA 2","MAGDALENA 2"],28:["VIAS DEL NUS","NUS","VINUS"],30:["GIRARDOT CAJAMARCA","GICA"],12:["BUCARAMANGA PAMPLONA"],13:["PAMPLONA CUCUTA"],17:["MALLA VIAL DEL META"],24:["POPAYAN SANTANDER DE QUILICHAO","POPAYAN QUILICHAO"],27:["VIA AL PUERTO"],46:["CORDOBA SUCRE"],47:["ACCESOS NORTE A BOGOTA","ACCESOS NORTE"],50:["RUTA CARIBE"],9:["CONEXION NORTE"],18:["MULALO LOBOGUERRERO"],32:["ARMENIA PEREIRA MANIZALES"],33:["BOGOTA LA VEGA VILLETA","SABANA DE OCCIDENTE"],37:["DEVIMED","ORIENTE DE MEDELLIN"],41:["SANTA MARTA RIOHACHA PARAGUACHON"],45:["BRICENO TUNJA SOGAMOSO"],52:["RUTA DEL SOL SECTOR 3"],154:["ALO SUR","AVENIDA LONGITUDINAL DE OCCIDENTE"],155:["TRONCAL DEL MAGDALENA C1","PUERTO SALGAR BARRANCABERMEJA"],156:["TRONCAL DEL MAGDALENA C2","SABANA DE TORRES CURUMANI"],157:["ACCESOS NORTE FASE II"],158:["BUENAVENTURA LOBOGUERRERO BUGA"],184:["AUTOPISTAS DEL CARIBE"],128:["RED FERREA DEL ATLANTICO","ATLANTICO"],132:["BOGOTA BELENCITO","DORADA CHIRIGUANA"],167:["CANAL DEL DIQUE"],196:["RIO META"]};function G(e,t){let o=A(e),n=[A(t.nombre),A(t.nombreCorto),...(me[t.id]||[]).map(A)].filter(Boolean),a=0;for(let i of n)if(i)if(o===i)a=Math.max(a,100);else if(o.includes(i)||i.includes(o))a=Math.max(a,80);else{let s=new Set(o.split(" ").filter(d=>d.length>2)),r=i.split(" ").filter(d=>d.length>2);if(!r.length)continue;let u=r.filter(d=>s.has(d)).length;a=Math.max(a,u/r.length*60)}return a}function J(e){let t=0,o=0,n=0;for(let a of e)for(let i of a)t+=i[0],o+=i[1],n+=1;return n?[t/n,o/n]:null}function Q(e,t){let o=new Map,n=[],a=new Set;for(let r of e){let u=r.props.ID_MT!=null?String(r.props.ID_MT).trim():null,d=r.props.COD_PR_IRE!=null?A(r.props.COD_PR_IRE):null,c=null,f=0;if(u){let b=t.find(y=>String(y.id)===u||A(y.codigo)===A(u));b&&(c=b,f=300)}if(!c&&d){let b=t.find(y=>A(y.codigo)===d);b&&(c=b,f=300)}if(!c&&r.props.NOMBRE){for(let b of t){if(b.tipo!==r.tipo)continue;let y=G(r.props.NOMBRE,b);y>f&&(f=y,c=b)}f<45&&(c=null)}if(!c&&r.props.CONCESION){for(let b of t){if(b.tipo!==r.tipo)continue;let y=Math.max(G(r.props.CONCESION,b),G(r.props.COD_PR_IRE||"",b));y>f&&(f=y,c=b)}f<45&&(c=null)}c?(o.has(c.id)||o.set(c.id,[]),o.get(c.id).push(...r.lineas),a.add(r.uid)):n.push(r)}let i=[];for(let[r,u]of o){let d=J(u),c=t.find(f=>f.id===r);d&&c&&i.push({id:r,tipo:c.tipo,c:d})}let s=[];for(let r of n){let u=J(r.lineas);if(!u)continue;let d=null,c=1/0;for(let f of i){if(f.tipo!==r.tipo)continue;let b=de(u,f.c);b<c&&(c=b,d=f)}d&&c<12e4?o.get(d.id).push(...r.lineas):s.push(r)}return{mapa:o,sinAsignar:s}}var L={gen:{"1G":"#4aa8ff","2G":"#7c9cff","3G":"#a78bfa","4G":"#37cfa5","5G":"#f5b942","s/g":"#8aa2b8"},etapa:{Operaci\u00F3n:"#37cfa5",Construcci\u00F3n:"#4aa8ff","Pre-construcci\xF3n":"#f5b942",Estructuraci\u00F3n:"#a78bfa",Reversi\u00F3n:"#8aa2b8"},tipo:{Carretero:"#37cfa5",F\u00E9rreo:"#f5b942",Fluvial:"#4aa8ff"}};function C(e,t){return t==="etapa"?L.etapa[e.etapa]||"#8aa2b8":t==="tipo"?L.tipo[e.tipo]||"#8aa2b8":L.gen[e.generacion]||L.gen["s/g"]}function x(e,t=1){return e==null||Number.isNaN(e)?"\u2014":e.toLocaleString("es-CO",{minimumFractionDigits:t,maximumFractionDigits:t})}function X(e){return e==null?"\u2014":e>=1e12?`$${(e/1e12).toFixed(2)} bill. COP`:e>=1e9?`$${(e/1e9).toFixed(1)} mil M COP`:e>=1e6?`$${(e/1e6).toFixed(0)} M COP`:`$${e.toLocaleString("es-CO")}`}function p(e){return String(e==null?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}var h=window.L,l={proyectos:[],porId:new Map,capas:new Map,seleccion:null,colorPor:"gen",filtros:{q:"",tipo:"",gen:"",etapa:""},muniIdx:null,deptIdx:null,lineasOficiales:0},m=e=>document.getElementById(e),g=h.map("map",{center:[4.6,-74.1],zoom:6,zoomControl:!1,preferCanvas:!0,worldCopyJump:!1,minZoom:4,maxZoom:16});h.control.zoom({position:"bottomright"}).addTo(g);var M={claro:h.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{subdomains:"abcd",maxZoom:20,attribution:"&copy; OpenStreetMap &copy; CARTO"}),oscuro:h.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{subdomains:"abcd",maxZoom:20,attribution:"&copy; OpenStreetMap &copy; CARTO"}),satelite:h.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"Imagery &copy; Esri, Maxar, Earthstar Geographics"}),osm:h.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap"})};M.oscuro.addTo(g);var ge=g.createPane("pais");ge.style.zIndex=150;var be=g.createPane("deptos");be.style.zIndex=175;var he=g.createPane("concesiones");he.style.zIndex=410;var ye=g.createPane("municipioActivo");ye.style.zIndex=405;var Y=g.createPane("halo");Y.style.zIndex=409;Y.style.pointerEvents="none";var F=h.layerGroup().addTo(g),w=h.layerGroup().addTo(g),E=null;function I(e,t=""){let o=m("status");m("status-text").textContent=e,o.className=`map-overlay map-status ${t}`,o.classList.remove("hidden")}function Ae(){m("status").classList.add("hidden")}function ve(e,t="ok",o=4200){I(e,t),t!=="err"&&setTimeout(()=>Ae(),o)}function Ie(e){h.geoJSON(e,{pane:"pais",interactive:!1,style:{color:"rgba(120,170,200,.35)",weight:.8,fillColor:"#0f2a3f",fillOpacity:1}}).addTo(g),h.geoJSON(e,{pane:"deptos",interactive:!1,style:{color:"rgba(140,190,215,.55)",weight:1,fill:!1}}).addTo(g)}async function Ce(){I("Cargando cat\xE1logo de concesiones ANI\u2026");let[e,t,o]=await Promise.all([fetch("./data/proyectos.json").then(n=>n.json()),fetch("./data/municipios.json").then(n=>n.json()).catch(()=>null),fetch("./data/departamentos.json").then(n=>n.json()).catch(()=>null)]);l.proyectos=e.proyectos,l.proyectos.forEach(n=>l.porId.set(n.id,n)),t&&(l.muniIdx=z(t)),o&&(l.deptIdx=z(o),Ie(o)),T(),v(),Me(),Se(e._meta),I("Descargando geometr\xEDa oficial de la ANI\u2026"),await W()}async function W(e=!1){try{let t=await K({force:e,onProgress:a=>{a.fase!=="cache"&&(a.fase==="carretero"&&a.total?I(`Descargando trazados oficiales de la ANI\u2026 ${a.hechos}/${a.total} corredores`):a.fase==="ferreo"?I("Descargando corredores f\xE9rreos\u2026"):a.fase==="fluvial"&&I("Descargando corredores fluviales\u2026"))}});Ee(t),v();let o=t.fuente==="cache"?"geometr\xEDa en cach\xE9 (red ANI)":"geometr\xEDa oficial ANI",n=l.proyectos.filter(a=>!l.capas.has(a.id)).length;ve(`Listo \xB7 ${l.lineasOficiales} trazados \xB7 ${o}`+(n?` \xB7 ${n} sin trazado publicado`:""),"ok"),document.body.dataset.listo="1"}catch{v(),I("No se pudo descargar la geometr\xEDa oficial de la ANI (sin conexi\xF3n o servicio bloqueado). La ficha de cada corredor y las longitudes siguen disponibles.","err"),document.body.dataset.listo="1"}}function Ee(e){l.capas.forEach(t=>g.removeLayer(t.layer)),l.capas.clear(),l.lineasOficiales=0,Le(e.carretero||[],e.ferreo||[],e.fluvial||[])}function Le(e,t,o){let n=[...e.map(i=>({...i,tipo:"Carretero"})),...t.map(i=>({...i,tipo:"F\xE9rreo"})),...o.map(i=>({...i,tipo:"Fluvial"}))],{mapa:a}=Q(n,l.proyectos);for(let[i,s]of a){let r=l.porId.get(i);if(!r)continue;let u=h.layerGroup();for(let d of s){let c=d.map(f=>[f[1],f[0]]);h.polyline(c,{pane:"concesiones",color:C(r,l.colorPor),weight:r.tipo==="Carretero"?3.2:2.6,opacity:.92,lineCap:"round",lineJoin:"round"}).on("click",f=>{h.DomEvent.stopPropagation(f),N(i,{pan:!1})}).on("mouseover",function(){this.setStyle({weight:r.tipo==="Carretero"?5.5:4.6,opacity:1}),this.bringToFront()}).on("mouseout",function(){this.setStyle({weight:r.tipo==="Carretero"?3.2:2.6,opacity:.92})}).bindTooltip(`<b>${p(r.nombreCorto||r.nombre)}</b><br><span style="opacity:.75">${r.longitudConcesionKm?x(r.longitudConcesionKm)+" km \xB7 ":""}${p(r.contratista||"Concesionario por confirmar")}</span>`,{sticky:!0,direction:"top",opacity:.96}).addTo(u)}u.addTo(g),l.capas.set(i,{layer:u,lineas:s})}return l.lineasOficiales=n.reduce((i,s)=>i+s.lineas.length,0),n.length}function N(e,{pan:t=!0}={}){l.seleccion=e;let o=l.porId.get(e);if(!o)return;E&&(g.removeLayer(E),E=null);let n=l.capas.get(e);if(n){let a=h.featureGroup().addTo(g);n.lineas.forEach(i=>{h.polyline(i.map(s=>[s[1],s[0]]),{pane:"halo",color:"#ffffff",weight:9,opacity:.28,lineCap:"round"}).addTo(a),h.polyline(i.map(s=>[s[1],s[0]]),{pane:"halo",color:C(o,l.colorPor),weight:5.5,opacity:1,lineCap:"round"}).addTo(a)}),E=a,t&&g.fitBounds(a.getBounds(),{padding:[60,60],maxZoom:12,duration:.5})}Oe(o),ee(e),xe(o)}function ee(e){document.querySelectorAll(".item").forEach(t=>{t.classList.toggle("active",Number(t.dataset.id)===e)})}function P(e){let t=l.muniIdx,o=l.capas.get(e.id);if(!t||!o)return[];let n=new Map;for(let a of o.lineas){let i=Math.max(1,Math.floor(a.length/120));for(let s=0;s<a.length;s+=i){let r=q(t,a[s]);r&&(n.has(r.c)||n.set(r.c,{nombre:r.m,depto:r.d,c:r.c,n:0}),n.get(r.c).n+=1)}}return[...n.values()].sort((a,i)=>i.n-a.n)}function xe(e){F.clearLayers();let t=P(e);if(!t.length||!l.muniIdx)return;let o=l.capas.get(e.id),n=C(e,l.colorPor);for(let a of t.slice(0,80)){let i=l.muniIdx.find(s=>s.props.c===a.c);i&&h.geoJSON({type:"Feature",geometry:i.geom,properties:{}},{pane:"municipioActivo",interactive:!1,style:{color:n,weight:1,opacity:.65,fillColor:n,fillOpacity:.1}}).addTo(F)}}function Ne(e){let t=[];if(e.telefono){let o=String(e.telefono).replace(/[^\d+]/g,"");t.push(`<a href="tel:${p(o)}">\u260E ${p(e.telefono)}</a>`)}return e.correo&&t.push(`<a href="mailto:${p(e.correo)}">\u2709 ${p(e.correo)}</a>`),e.web&&t.push(`<a href="${p(e.web)}" target="_blank" rel="noopener">\u2197 Sitio web</a>`),t.length?`<div class="contact-actions">${t.join("")}</div>`:""}function Oe(e){let t=m("detail-body"),o=e.interventoria||{},n=P(e),a=l.capas.get(e.id),i=C(e,l.colorPor),s=[];e.tipo&&s.push(`<span class="badge">${p(e.tipo)}</span>`),e.generacion&&s.push(`<span class="badge acc">${p(e.generacion)}</span>`),e.ola&&e.ola!=="No aplica"&&s.push(`<span class="badge">${p(e.ola)}</span>`),e.etapa&&s.push(`<span class="badge amber">${p(e.etapa)}</span>`);let r=`
    <div class="big-kms">
      <div class="kms">
        <b>${e.longitudConcesionKm!=null?x(e.longitudConcesionKm):"\u2014"}</b>
        <span>km del contrato de concesi\xF3n</span>
      </div>
      <div class="kms">
        <b>${e.longitudCargoKm!=null?x(e.longitudCargoKm):"\u2014"}</b>
        <span>km de red a cargo (ANI)</span>
      </div>
    </div>`,u=o.nombre?`<div class="card-inner">
         <div class="who">${p(o.nombre)}</div>
         ${o.verificado===!1?'<div class="alert" style="margin:8px 0 10px">Emparejamiento indicativo: el objeto del contrato en SECOP II no nombra expl\xEDcitamente este corredor. <b>Conf\xEDrmalo en SECOP II</b> antes de citarlo.</div>':""}
         <dl class="kv">
           ${o.contrato?`<dt>Contrato</dt><dd class="mono">${p(o.contrato)}</dd>`:""}
           ${o.valorCop?`<dt>Valor</dt><dd>${p(X(o.valorCop))}</dd>`:""}
           ${o.estado?`<dt>Estado</dt><dd>${p(o.estado)}</dd>`:""}
         </dl>
       </div>`:`<div class="card-inner">
         <div class="who">No consolidada en este aplicativo</div>
         <p class="note">El nombre de la interventor\xEDa de este corredor debe confirmarse en SECOP II
         (Agencia Nacional de Infraestructura \u2013 ANI). Usa el bot\xF3n de b\xFAsqueda para verificar antes
         de radicar cualquier derecho de petici\xF3n.</p>
       </div>`,d=e.contratista?`<div class="card-inner">
         <div class="who">${p(e.contratista)}</div>
         <dl class="kv">
           ${e.nit?`<dt>NIT</dt><dd class="mono">${p(e.nit)}</dd>`:""}
           ${e.contratoConcesion?`<dt>Contrato</dt><dd>${p(e.contratoConcesion)}</dd>`:""}
           ${e.municipioDomicilio?`<dt>Domicilio</dt><dd>${p(e.municipioDomicilio)}</dd>`:""}
           ${e.direccion?`<dt>Direcci\xF3n</dt><dd>${p(e.direccion)}</dd>`:""}
         </dl>
         ${Ne(e)}
       </div>`:`<div class="card-inner"><div class="who">Concesionario no registrado</div>
       <p class="note">Este registro no tiene contratista asociado en el listado de la ANI
       (corredor revertido, en estructuraci\xF3n o contrato de obra).</p></div>`;t.innerHTML=`
    <span class="code">${p(e.codigo||"")} \xB7 ID ${p(e.id)}</span>
    <h2>${p(e.nombre)}</h2>
    <div class="badges">${s.join("")}</div>
    ${r}
    ${a?"":'<div class="alert">Este corredor no tiene trazado geogr\xE1fico publicado en el servicio de datos abiertos de la ANI. Los datos contractuales s\xED est\xE1n disponibles.</div>'}
    <section>
      <h3>Concesionario a cargo</h3>
      ${d}
    </section>
    <section>
      <h3>Interventor\xEDa</h3>
      ${u}
    </section>
    <section>
      <h3>Municipios por donde pasa ${n.length?`(${n.length})`:""}</h3>
      ${n.length?`<div class="municipios">${n.map(c=>`<span class="m" title="${p(c.depto)}">${p(c.nombre)} \xB7 ${p(c.depto)}</span>`).join("")}</div>
             <p class="note">Calculado intersectando el trazado oficial con la cartograf\xEDa municipal
             (MGN/IGAC). \xDAtil para saber a qu\xE9 municipio dirigir la solicitud.</p>`:`<p class="note">${a?"No fue posible determinar municipios para este trazado.":"Sin trazado geogr\xE1fico para calcular municipios."}</p>`}
    </section>
    <section>
      <h3>\xBFC\xF3mo radicar tu solicitud?</h3>
      <p class="note">
        1) Identifica el municipio con el mapa. 2) La v\xEDa est\xE1 concesionada por la ANI: el
        <b>concesionario</b> es el responsable directo de la operaci\xF3n y atenci\xF3n al usuario; la
        <b>interventor\xEDa</b> vigila el contrato en nombre del Estado. 3) Radica con copia a la ANI
        (canal oficial de PQRS) y al concesionario, citando el
        ${e.contratoConcesion?`<b>contrato de concesi\xF3n ${p(e.contratoConcesion)}</b>`:"contrato de concesi\xF3n"} y el
        c\xF3digo <code>${p(e.codigo||"")}</code>.
      </p>
    </section>
  `,m("detail").classList.remove("hidden"),document.querySelector(".layout").classList.add("with-detail")}function D(){m("detail").classList.add("hidden"),document.querySelector(".layout").classList.remove("with-detail"),l.seleccion=null,F.clearLayers(),E&&(g.removeLayer(E),E=null),ee(null)}function oe(e){let t=[e.lng,e.lat],o=l.muniIdx?q(l.muniIdx,t):null;if(m("hint").classList.add("hidden"),w.clearLayers(),h.circleMarker(e,{radius:6,color:"#ffffff",weight:2,fillColor:"#f5b942",fillOpacity:1}).addTo(w),o){let u=l.muniIdx.find(d=>d.props.c===o.c);u&&h.geoJSON({type:"Feature",geometry:u.geom,properties:{}},{pane:"municipioActivo",interactive:!1,style:{color:"#f5b942",weight:2,opacity:.95,fillColor:"#f5b942",fillOpacity:.14}}).addTo(w)}let n=null,a=1/0;for(let[u,d]of l.capas)for(let c of d.lineas){let{dist:f}=Z(t,c);f<a&&(a=f,n=u)}let i=n!=null&&a<25e3?l.porId.get(n):null,s=m("point-body");s.innerHTML=`
    <div style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#6f8aa3;margin-bottom:6px">Punto consultado</div>
    <div style="font-size:15px;font-weight:700;margin-bottom:2px">
      ${o?p(o.m):"Fuera de Colombia / zona no cartografiada"}
    </div>
    <div style="font-size:11.5px;color:#9bb2c7;margin-bottom:10px">
      ${o?p(o.d):""} \xB7 ${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}
    </div>
    ${i?`<div style="border-top:1px solid rgba(255,255,255,.09);padding-top:10px">
             <div style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#6f8aa3;margin-bottom:5px">
               Corredor ANI m\xE1s cercano \xB7 ${(a/1e3).toFixed(1)} km
             </div>
             <div style="font-weight:700;font-size:13px;line-height:1.3">${p(i.nombreCorto||i.nombre)}</div>
             <div style="font-size:11.5px;color:#9bb2c7;margin-top:5px">
               <b style="color:#e8f1f8">Concesionario:</b> ${p(i.contratista||"Por confirmar")}<br>
               <b style="color:#e8f1f8">Interventor\xEDa:</b> ${p(i.interventoria&&i.interventoria.nombre||"Por verificar en SECOP II")}
             </div>
             <button class="linkbtn" style="margin-top:9px;color:#37cfa5" data-abrir="${i.id}">
               Ver ficha completa \u2192
             </button>
           </div>`:`<div style="border-top:1px solid rgba(255,255,255,.09);padding-top:10px;font-size:11.5px;color:#9bb2c7">
             No se detecta una v\xEDa concesionada por la ANI en un radio de 25 km. Podr\xEDa tratarse de una
             v\xEDa a cargo de INVIAS o de un ente territorial.
           </div>`}
  `;let r=s.querySelector("[data-abrir]");r&&r.addEventListener("click",()=>N(Number(r.dataset.abrir))),m("point-card").classList.remove("hidden")}function k(){let{q:e,tipo:t,gen:o,etapa:n}=l.filtros,a=e.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");return l.proyectos.filter(i=>{var r;if(t&&i.tipo!==t||o&&i.generacion!==o||n&&(n==="Reversi\xF3n"&&!/revers/i.test(i.etapa||"")||n!=="Reversi\xF3n"&&i.etapa!==n))return!1;if(!a)return!0;let s=[i.nombre,i.nombreCorto,i.contratista,(r=i.interventoria)==null?void 0:r.nombre,i.codigo,i.municipioDomicilio].join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");return a.split(/\s+/).every(u=>s.includes(u))})}function v(){let e=k(),t=m("list");if(m("list-count").textContent=e.length,m("list-title").textContent=l.filtros.q||l.filtros.tipo||l.filtros.gen||l.filtros.etapa?"Resultados":"Corredores ANI",!e.length){t.innerHTML='<div class="empty">Sin resultados. Ajusta la b\xFAsqueda o los filtros.</div>';return}t.innerHTML=e.map(o=>{let n=C(o,l.colorPor),a=o.longitudConcesionKm!=null?`${x(o.longitudConcesionKm)}<small> km</small>`:"<small>s/d</small>",i=l.capas.has(o.id);return`<div class="item" data-id="${o.id}" role="option" tabindex="0">
        <span class="swatch" style="background:${n}"></span>
        <span>
          <span class="nm">${p(o.nombreCorto||o.nombre)}</span>
          <span class="sub">
            <span>${p(o.codigo||"")}</span>
            <span class="sep">\xB7</span>
            <span>${p(o.generacion||o.tipo)}</span>
            ${o.etapa?`<span class="sep">\xB7</span><span>${p(o.etapa)}</span>`:""}
            ${i?"":'<span class="sep">\xB7</span><span style="color:#f5b942">sin trazado</span>'}
          </span>
        </span>
        <span class="km">${a}</span>
      </div>`}).join(""),t.querySelectorAll(".item").forEach(o=>{let n=Number(o.dataset.id);o.addEventListener("click",()=>N(n)),o.addEventListener("keydown",a=>{(a.key==="Enter"||a.key===" ")&&(a.preventDefault(),N(n))})})}function T(){let e=k(),t=e.reduce((i,s)=>i+(s.longitudConcesionKm||0),0),o=e.filter(i=>i.interventoria&&i.interventoria.nombre).length,n=e.filter(i=>l.capas.has(i.id)).length,a=e.length!==l.proyectos.length;m("stats").innerHTML=`
    <div class="stat accent"><b>${x(t,0)}</b><span>km concesionados${a?" (filtro)":""}</span></div>
    <div class="stat"><b>${e.length}</b><span>corredores${a?" en el filtro":""}</span></div>
    <div class="stat"><b>${o}</b><span>con interventor\xEDa</span></div>
    <div class="stat" style="grid-column:1/-1;display:flex;align-items:center;gap:8px;background:rgba(74,168,255,.07);border-color:rgba(74,168,255,.22)">
      <b style="font-size:12px;color:#9fd0ff">${n}</b>
      <span style="margin:0;text-transform:none;letter-spacing:0;font-size:11px;color:#9bb2c7">
        corredores con trazado en el mapa${l.lineasOficiales?` \xB7 ${l.lineasOficiales} trazados oficiales`:""}
      </span>
    </div>
  `}function te(){let e=L[l.colorPor],t=l.colorPor==="gen"?"Generaci\xF3n":l.colorPor==="etapa"?"Etapa":"Modo";m("legend").innerHTML=`
    <h4>${t}</h4>
    ${Object.entries(e).map(([o,n])=>`<div class="row"><i style="background:${n}"></i>${o==="s/g"?"Sin dato":p(o)}</div>`).join("")}
    <div class="row" style="margin-top:8px;border-top:1px solid rgba(255,255,255,.09);padding-top:7px;opacity:.8">
      <i style="background:#fff;opacity:.5"></i>Corredor seleccionado
    </div>
  `}function $e(){var s,r,u,d;let e=k(),t=["Codigo","ID","Nombre","Modo","Generacion","Ola","Etapa","KmConcesion","KmRedACargo","Concesionario","NIT","ContratoConcesion","Interventoria","ContratoInterventoria","ValorInterventoriaCOP","EstadoInterventoria","CorreoConcesionario","TelefonoConcesionario","WebConcesionario","MunicipiosCruzados"],o=c=>`"${String(c!=null?c:"").replace(/"/g,'""')}"`,n=[t.join(",")];for(let c of e){let f=P(c).map(b=>b.nombre);n.push([c.codigo,c.id,c.nombre,c.tipo,c.generacion,c.ola,c.etapa,c.longitudConcesionKm,c.longitudCargoKm,c.contratista,c.nit,c.contratoConcesion,(s=c.interventoria)==null?void 0:s.nombre,(r=c.interventoria)==null?void 0:r.contrato,(u=c.interventoria)==null?void 0:u.valorCop,(d=c.interventoria)==null?void 0:d.estado,c.correo,c.telefono,c.web,f.join(" | ")].map(o).join(","))}let a=new Blob(["\uFEFF"+n.join(`
`)],{type:"text/csv;charset=utf-8"}),i=document.createElement("a");i.href=URL.createObjectURL(a),i.download=`concesiones-ani-${new Date().toISOString().slice(0,10)}.csv`,i.click(),URL.revokeObjectURL(i.href)}function Se(e={}){m("about-body").innerHTML=`
    <p>Este visor re\xFAne, en un solo lugar, <b>las v\xEDas concesionadas por la Agencia Nacional de
    Infraestructura (ANI)</b>: trazado sobre el mapa, longitud contractual, concesionario,
    interventor\xEDa y los municipios que atraviesa cada corredor. El objetivo es que puedas
    identificar en minutos <b>qui\xE9n responde</b> por un tramo antes de radicar una petici\xF3n.</p>

    <h3>Fuentes de informaci\xF3n</h3>
    <ul>
      <li><b>Geometr\xEDa oficial:</b> servicio de datos abiertos de la ANI
        (<code>OpenDataAni \xB7 Concesiones Carreteras / Modos_ANI</code>), consultado en tiempo real
        y almacenado en cach\xE9 local por 72 h.</li>
      <li><b>Datos de contacto y contratista:</b> conjunto <i>Concesiones ANI</i> de datos.gov.co
        (corte del archivo entregado: 2026-11-18).</li>
      <li><b>Longitudes, generaci\xF3n, ola y etapa:</b> capa <code>Modos_ANI \xB7 Carretero</code>
        de la ANI (campos <code>LngCnc</code> y <code>LngCrg</code>).</li>
      <li><b>Interventor\xEDas:</b> contratos de interventor\xEDa de la ANI publicados en
        <b>SECOP II</b> (datos.gov.co, dataset <code>jbjy-vk9h</code>), consultados 2026-11-18.</li>
      <li><b>Divisi\xF3n municipal:</b> Marco Geoestad\xEDstico Nacional (DANE/IGAC) v\xEDa
        <code>geoColombia</code>.</li>
    </ul>

    <h3>Qu\xE9 significa cada cifra</h3>
    <ul>
      <li><b>km del contrato de concesi\xF3n:</b> longitud total del corredor seg\xFAn el contrato
        (puede incluir tramos en operaci\xF3n y en construcci\xF3n).</li>
      <li><b>km de red a cargo:</b> longitud de la red que la ANI reporta como administrada por
        ese contrato; puede diferir del valor contractual.</li>
    </ul>

    <h3>Limitaciones que debes conocer</h3>
    <ul>
      <li>Algunos corredores (especialmente 5G en estructuraci\xF3n) <b>a\xFAn no publican trazado</b>
        en el servicio de la ANI. Su ficha contractual s\xED est\xE1 disponible.</li>
      <li>Algunas interventor\xEDas aparecen como <i>\u201Cpor verificar\u201D</i>: son contratos cuyo objeto
        en SECOP II no nombra expl\xEDcitamente el corredor. <b>Verif\xEDcalas en SECOP II</b> antes de
        usarlas en una actuaci\xF3n formal.</li>
      <li>El visor <b>no reemplaza</b> la respuesta oficial de la ANI ni de la interventor\xEDa.
        Es una herramienta de orientaci\xF3n.</li>
    </ul>

    <h3>Para radicar un derecho de petici\xF3n</h3>
    <p>Identifica el municipio en el mapa, el corredor y el concesionario; radica ante el
    concesionario (responsable de la operaci\xF3n) y con copia a la ANI (concedente), citando el
    n\xFAmero de contrato de concesi\xF3n y el c\xF3digo del proyecto. La interventor\xEDa es la instancia de
    control del Estado sobre ese contrato.</p>

    <p style="margin-top:16px;font-size:11.5px;color:#8fa8bf">
      Datos de referencia: ${p(e.fuenteLongitudes||"ANI \u2013 datos abiertos")}.
      \xDAltima consulta de interventor\xEDas: ${p(e.fuenteAdjudicacion||"SECOP II")}.
    </p>
  `}function Me(){let e=m("q"),t;e.addEventListener("input",()=>{clearTimeout(t),t=setTimeout(()=>{l.filtros.q=e.value.trim(),v(),T()},130)}),m("f-tipo").addEventListener("change",o=>{l.filtros.tipo=o.target.value,v(),T()}),m("f-gen").addEventListener("change",o=>{l.filtros.gen=o.target.value,v(),T()}),m("f-etapa").addEventListener("change",o=>{l.filtros.etapa=o.target.value,v(),T()}),document.querySelectorAll(".segmented button").forEach(o=>{o.addEventListener("click",()=>{document.querySelectorAll(".segmented button").forEach(n=>n.classList.remove("active")),o.classList.add("active"),l.colorPor=o.dataset.color,Te(),te(),v(),l.seleccion&&N(l.seleccion,{pan:!1})})}),m("btn-reset").addEventListener("click",()=>{D(),w.clearLayers(),g.fitBounds(h.latLngBounds([[-4.3,-79.2],[13.6,-66.8]]),{padding:[10,10]})}),m("detail-close").addEventListener("click",D),m("point-close").addEventListener("click",()=>m("point-card").classList.add("hidden")),m("btn-export").addEventListener("click",$e),m("btn-about").addEventListener("click",()=>m("about").classList.remove("hidden")),m("about-close").addEventListener("click",()=>m("about").classList.add("hidden")),m("about").addEventListener("click",o=>{o.target.id==="about"&&m("about").classList.add("hidden")}),m("btn-refresh").addEventListener("click",async()=>{try{localStorage.removeItem("ani-geom-v3")}catch{}l.capas.forEach(o=>g.removeLayer(o.layer)),l.capas.clear(),D(),I("Actualizando geometr\xEDa desde la ANI\u2026"),await W(!0)}),g.on("click",o=>oe(o.latlng)),g.on("baselayerchange",()=>{}),document.addEventListener("keydown",o=>{o.key==="/"&&document.activeElement!==e&&(o.preventDefault(),e.focus(),e.select()),o.key==="Escape"&&(m("about").classList.contains("hidden")?m("point-card").classList.contains("hidden")?D():m("point-card").classList.add("hidden"):m("about").classList.add("hidden"))}),h.control.layers({"Mapa oscuro":M.oscuro,"Mapa claro":M.claro,Sat\u00E9lite:M.satelite,OpenStreetMap:M.osm},{},{position:"bottomright",collapsed:!0}).addTo(g)}function Te(){for(let[e,t]of l.capas){let o=l.porId.get(e);t.layer.eachLayer(n=>n.setStyle({color:C(o,l.colorPor)}))}}(async function(){te(),await Ce(),window.__ani={map:g,state:l,seleccionar:N,consultarPunto:oe,proyectosFiltrados:k,municipiosDe:P}})();})();
