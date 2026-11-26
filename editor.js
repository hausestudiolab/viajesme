/* Los cambios locales se publican únicamente al pulsar Sincronizar. */
const STORE='viajesme-edits-v1';
const originalPlaces=P.map((p,i)=>[...p,undefined,'base-'+i]);
let edits={places:{},days:{}};
function validEdits(v){
 if(!v||typeof v!=='object'||!v.places||!v.days)throw Error('Formato de datos inválido');
 for(const [id,r] of Object.entries(v.places)){
  if(!/^(base-\d+|new-[a-zA-Z0-9-]+)$/.test(id)||!Number.isFinite(r.updated))throw Error('Punto inválido');
  if(!r.deleted&&(!Array.isArray(r.value)||r.value.length!==10||![0,1,2,3,4,5,8,9].every(i=>typeof r.value[i]==='string')||r.value[9]!==id||![6,7].every(i=>r.value[i]===null||Number.isFinite(r.value[i]))))throw Error('Punto inválido');
 }
 for(const [id,r] of Object.entries(v.days))if(!/^\d+$/.test(id)||+id>=days.length||!Number.isFinite(r.updated)||!Array.isArray(r.value)||r.value.length!==4||!r.value.every(x=>typeof x==='string'))throw Error('Jornada inválida');
 return v;
}
function mergeEdits(a,b){const out={places:{...a.places},days:{...a.days}};for(const group of ['places','days'])for(const [id,r] of Object.entries(b[group]))if(!out[group][id]||r.updated>out[group][id].updated)out[group][id]=r;return out;}
try{const saved=localStorage.getItem(STORE);if(saved)edits=validEdits(JSON.parse(saved));}catch{document.getElementById('editStatus').textContent='No se pudieron recuperar los cambios locales.';}
function status(text){$('editStatus').textContent=text;}
function persist(next){try{localStorage.setItem(STORE,JSON.stringify(next));edits=next;return true;}catch{status('No se pudo guardar. Revisa el almacenamiento del navegador antes de cerrar.');return false;}}
function refreshPlaces(){
 P.splice(0,P.length,...originalPlaces.filter(p=>!edits.places[p[9]]?.deleted).map(p=>edits.places[p[9]]?.value||p),...Object.entries(edits.places).filter(([id,r])=>id.startsWith('new-')&&!r.deleted).map(([,r])=>r.value));
 for(const [i,r] of Object.entries(edits.days))days[+i]=r.value;
 sectors.splice(0,sectors.length,...new Set(P.map(p=>p[0])));cats.splice(0,cats.length,...new Set(P.map(p=>p[2])));
 for(const id of ['sectorPick','filterSector','mapSector']){
  const wrap=$(id+'DD'),menu=wrap.querySelector('.check-menu'),checked=selectedValues(id).filter(v=>sectors.includes(v));
  menu.querySelectorAll('.check-option').forEach(n=>n.remove());
  const foot=menu.querySelector('.check-menu-foot');
  for(const sector of sectors){const label=document.createElement('label');label.className='check-option';const input=document.createElement('input');input.type='checkbox';input.value=sector;input.checked=checked.includes(sector);const span=document.createElement('span');span.textContent=sector;label.append(input,span);menu.insertBefore(label,foot);}
  $(id).value=checked.join('|');wrap.querySelector('.check-trigger').textContent=checked.length?checked.join(', '):'Todos los sectores';
 }
 for(const id of ['catPick','filterCat','mapCat']){const old=$(id).value;fillSelect(id,cats,'Todas las categorías');$(id).value=cats.includes(old)?old:'';}
 const origins=[...new Set(P.map(p=>p[3]))],old=$('filterOrigin').value;fillSelect('filterOrigin',origins,'Todos los orígenes');$('filterOrigin').value=origins.includes(old)?old:'';
 const dates=[...new Set([...dateOptions,...P.map(p=>p[8]).filter(Boolean),...days.map(d=>d[0])])];
 for(const id of ['sectorDate','filterDate','mapDate']){const old=$(id).value;fillSelect(id,dates,'Todas las fechas');$(id).value=dates.includes(old)?old:'';}
 $('editorSectors').replaceChildren(...sectors.map(s=>new Option(s,s)));$('editorCats').replaceChildren(...cats.map(s=>new Option(s,s)));
 const home=P.find(p=>p[2]==='Base');if(home)document.querySelector('.meta span').textContent='⌖ '+(home[5]||'Alojamiento')+' · '+home[0];
 renderAgenda();renderSector();renderAll();if(map)renderMap();
}
card=function(p){const e=escapeHtml;return `<article class="place"><div class="place-top"><div><h3>${e(p[1])}</h3><p>${e(p[0])}${p[4]?' · '+e(p[4]):''}</p></div><span class="tag">${e(p[2])}</span></div><p>${e(p[5])}</p><div class="date-tag">Fecha: ${e(dateFor(p))}</div>${p[6]===null?'<p>Sin marcador: agrega coordenadas verificadas para verlo en el mapa.</p>':''}<div class="origin">${e(p[3])}</div><div class="actions"><a href="${e(mapsSearch(p))}" target="_blank" rel="noopener">Cómo llegar ↗</a><button type="button" data-copy-place="${e(p[9])}">Copiar dirección</button><button type="button" data-edit-place="${e(p[9])}">Editar lugar y fecha</button></div></article>`;};
const agendaRenderer=renderAgenda;
renderAgenda=function(){agendaRenderer();$('agendaList').querySelectorAll('.day').forEach((node,i)=>{const b=document.createElement('button');b.type='button';b.textContent='Editar jornada y fecha';b.dataset.editDay=i;node.lastElementChild.append(document.createElement('br'),b);});};
document.addEventListener('click',async event=>{const b=event.target.closest('[data-copy-place]');if(!b)return;const p=P.find(p=>p[9]===b.dataset.copyPlace);if(!p)return;try{await navigator.clipboard.writeText([p[1],p[5],p[0],'Buenos Aires, Argentina'].filter(Boolean).join(', '));status('Dirección copiada.');}catch{status('No se pudo copiar la dirección. Puedes abrirla con Cómo llegar.');}});
let editingId=null,editingDay=null;
function openPlace(id){editingDay=null;editingId=id||'new-'+crypto.randomUUID();const p=id?P.find(p=>p[9]===id):['','','Lugar','Mis puntos','','',null,null,'',editingId];$('placeForm').reset();for(const [field,index] of Object.entries({name:1,sector:0,category:2,notes:4,address:5,lat:6,lng:7}))$('point-'+field).value=p[index]??'';$('point-date').value=p[8]||dateFor(p);$('deletePoint').hidden=!id;$('pointTitle').textContent=id?'Editar lugar':'Agregar punto';$('pointDialog').showModal();}
$('addPoint').onclick=()=>openPlace();
document.addEventListener('click',event=>{const b=event.target.closest('[data-edit-place],[data-edit-day]');if(!b)return;if(b.dataset.editPlace)openPlace(b.dataset.editPlace);else{editingDay=+b.dataset.editDay;const d=days[editingDay];['date','title','plan','notes'].forEach((k,i)=>$('day-'+k).value=d[i]);$('dayDialog').showModal();}});
for(const b of document.querySelectorAll('[data-close-dialog]'))b.onclick=()=>b.closest('dialog').close();
$('placeForm').onsubmit=event=>{
 event.preventDefault();const value=id=>$(id).value.trim();const lat=value('point-lat'),lng=value('point-lng');
 if((lat==='')!==(lng==='')||(lat!==''&&(!Number.isFinite(+lat)||!Number.isFinite(+lng)||Math.abs(+lat)>90||Math.abs(+lng)>180))){$('point-lat').setCustomValidity('Completa ambas coordenadas válidas o deja ambas vacías.');$('point-lat').reportValidity();return;}
 const old=P.find(p=>p[9]===editingId);const p=[value('point-sector'),value('point-name'),value('point-category'),old?.[3]||'Mis puntos',value('point-notes'),value('point-address'),lat===''?null:+lat,lng===''?null:+lng,value('point-date'),editingId];
 if(!p[0]||!p[1]||!p[2])return;
 if(old&&(old[5]!==p[5]||old[0]!==p[0])&&old[6]===p[6]&&old[7]===p[7]){p[6]=null;p[7]=null;}
 const next=mergeEdits(edits,{places:{[editingId]:{value:p,updated:Date.now()}},days:{}});if(!persist(next))return;
 refreshPlaces();$('pointDialog').close();status('Guardado en este dispositivo. Pulsa Sincronizar con GitHub para verlo en los demás.');
 document.querySelector('[data-view="lugares"]').click();$('search').value=p[1];$('filterSector').value='';for(const id of ['filterCat','filterOrigin','filterDate'])$(id).value='';refreshPlaces();
};
for(const id of ['point-lat','point-lng'])$(id).oninput=()=>$('point-lat').setCustomValidity('');
$('deletePoint').onclick=()=>{if(!confirm('¿Eliminar este lugar de la guía?'))return;if(persist(mergeEdits(edits,{places:{[editingId]:{deleted:true,updated:Date.now()}},days:{}}))){refreshPlaces();$('pointDialog').close();status('Lugar eliminado en este dispositivo. Sincroniza para publicar el cambio.');}};
$('dayForm').onsubmit=event=>{event.preventDefault();const value=['date','title','plan','notes'].map(k=>$('day-'+k).value.trim());if(persist(mergeEdits(edits,{places:{},days:{[editingDay]:{value,updated:Date.now()}}}))){refreshPlaces();$('dayDialog').close();status('Jornada guardada en este dispositivo. Sincroniza para publicarla.');}};
$('syncPoints').onclick=()=>$('syncDialog').showModal();
const api='https://api.github.com/repos/hausestudiolab/viajesme/contents/points.json';
function decodeContent(content){return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(content.replace(/\s/g,'')),c=>c.charCodeAt(0))));}
function encodeContent(value){const bytes=new TextEncoder().encode(JSON.stringify(value,null,2));let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);}
$('syncForm').onsubmit=async event=>{
 event.preventDefault();const token=$('githubToken').value.trim();if(!token)return;
 const button=$('publishPoints');button.disabled=true;$('syncStatus').textContent='Sincronizando…';
 try{
  const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  const response=await fetch(api+'?ref=main&_='+Date.now(),{headers,cache:'no-store'});let sha,remote={places:{},days:{}};
  if(response.ok){const file=await response.json();sha=file.sha;remote=validEdits(decodeContent(file.content));}else if(response.status!==404)throw Error('GitHub rechazó la conexión. Comprueba el token y sus permisos.');
  const merged=mergeEdits(remote,edits);const result=await fetch(api,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({message:'Actualizar puntos y fechas de la guía',content:encodeContent(merged),branch:'main',...(sha?{sha}:{})})});
  if(!result.ok)throw Error(result.status===409?'Hubo otro cambio al mismo tiempo. Vuelve a sincronizar.':'No se pudo publicar. Revisa que el token permita Contents: Read and write en viajesme.');
  persist(merged);refreshPlaces();$('githubToken').value='';$('syncDialog').close();status('Sincronizado con GitHub. Abre o recarga la guía en el otro dispositivo para recibir los cambios.');
 }catch(error){$('syncStatus').textContent=error.message;}finally{button.disabled=false;}
};
$('syncDialog').addEventListener('close',()=>{$('githubToken').value='';$('syncStatus').textContent='';});
refreshPlaces();
(async()=>{try{const response=await fetch(api+'?ref=main&_='+Date.now(),{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});if(!response.ok)throw Error();const file=await response.json();const merged=mergeEdits(edits,validEdits(decodeContent(file.content)));persist(merged);refreshPlaces();}catch{status('Modo local. Tus cambios se conservan aquí; sincroniza con GitHub para compartirlos entre dispositivos.');}})();
