// The service owns the SQLite writer and prevents overlapping downloads.
const origin='http://127.0.0.1:5180';
try{
 const response=await fetch(`${origin}/api/status`);const status=await response.json();
 if(status.app!=='draftlab-updater')throw Error('El puerto 5180 no corresponde a Draftlab.');
 if(process.argv.includes('--status'))console.log(JSON.stringify(status,null,2));
 else{const r=await fetch(`${origin}/api/start`,{method:'POST',headers:{origin}});if(!r.ok)throw Error('No se pudo iniciar la descarga.');console.log(`Actualización iniciada. Progreso: ${origin}`);}
}catch(e){console.error(`No se pudo consultar el actualizador: ${e.message}. Abre Iniciar actualizador.cmd en el proyecto.`);process.exitCode=1;}
