const $=id=>document.getElementById(id);
const number=n=>Number(n||0).toLocaleString('es-CL');
const date=n=>n?new Date(n).toLocaleString('es-CL'):'—';
let requesting=false;
async function refresh(){
 if(requesting)return;requesting=true;
 try{
  const response=await fetch('/api/status');if(!response.ok)throw Error('No se pudo consultar el estado.');const s=await response.json(),j=s.job;
  $('connectionError').hidden=true;const busy=['running','waiting'].includes(j.status);
  $('total').textContent=number(s.total);$('checked').textContent=number(s.checked);$('current').textContent=number(s.patches.find(p=>p.patch===s.catalogPatch)?.count);$('patchLabel').textContent=`Parche ${s.catalogPatch}`;
  $('state').textContent=({idle:'Listo',running:'Descargando',waiting:'Esperando a Riot',paused:'Pausado',error:'Requiere atención',complete:'Actualizado'})[j.status]||j.status;
  $('message').textContent=j.message;
  const discovery=j.stage==='discover',max=discovery?j.playerCount:j.total,value=discovery?j.discovered:j.completed;
  $('progress').max=max||1;$('progress').value=j.status==='complete'?(max||1):(value||0);
  $('stage').textContent=discovery?`Buscando IDs · ${value||0} / ${max} cuentas`:`Partidas revisadas · ${value||0} / ${max||0}`;
  $('percent').textContent=j.status==='complete'?'100%':`${max?Math.floor((value||0)/max*100):0}%`;
  $('added').textContent=number(j.added);$('duplicates').textContent=number(j.duplicates);$('rejected').textContent=number(j.rejected);
  $('start').disabled=busy;$('pause').disabled=!busy;$('start').textContent=['paused','error'].includes(j.status)?'Reanudar descarga':'Actualizar ahora';
  $('timing').textContent=j.status==='waiting'?`Reintento en ${Math.max(0,Math.ceil((j.retryAt-Date.now())/1000))} s`:j.finishedAt&&j.status==='complete'?`Terminó ${date(j.finishedAt)}`:busy?'Puedes cerrar esta pestaña.':'';
  $('auto').checked=s.settings.auto;if(document.activeElement!==$('hours'))$('hours').value=String(s.settings.hours);
  $('nextRun').textContent=s.settings.auto?(busy?`La próxima ronda será ${s.settings.hours} horas después de terminar.`:`Próxima actualización: ${date(s.settings.nextRun)}`):'Actualización automática desactivada.';
  $('patches').replaceChildren();for(const patch of s.patches){const row=document.createElement('tr');for(const text of [patch.patch,number(patch.count)]){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}const cell=document.createElement('td'),link=document.createElement('a');link.href=`/api/export?patch=${encodeURIComponent(patch.patch)}`;link.textContent='Exportar ↓';link.setAttribute('aria-label',`Exportar parche ${patch.patch}`);cell.append(link);row.append(cell);$('patches').append(row);}
  $('checkedAt').textContent=`Consultado ${new Date().toLocaleTimeString('es-CL')}`;
 }catch(e){$('connectionError').hidden=false;$('connectionError').textContent=`${e.message} Comprueba que el actualizador esté abierto en este PC.`;$('state').textContent='Sin conexión';$('start').disabled=true;$('pause').disabled=true;}
 finally{requesting=false;}
}
async function post(path,data){try{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});if(!r.ok)throw Error('No se pudo aplicar el cambio.');await refresh();}catch(e){$('connectionError').hidden=false;$('connectionError').textContent=e.message;}}
$('start').onclick=()=>post('/api/start');$('pause').onclick=()=>post('/api/pause');$('refresh').onclick=refresh;
const settings=()=>post('/api/settings',{auto:$('auto').checked,hours:Number($('hours').value)});
$('auto').onchange=settings;$('hours').onchange=settings;
void refresh();setInterval(refresh,1500);
