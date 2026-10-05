import {getChatGPTUser} from '../../chatgpt-auth';
import {getDb} from '../../../db';
import {workspaceSchema} from '../../../lib/validation';
export async function GET(){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Inicia sesión para cargar tu espacio.'},{status:401});
 try {const row=await getDb().prepare('SELECT data,revision FROM workspaces WHERE user_id = ?').bind(user.userId).first<{data:string;revision:number}>(); return Response.json({workspace:row?JSON.parse(row.data):null,revision:row?.revision??0},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'No pudimos cargar tu espacio. Reintenta antes de editar.'},{status:503});}
}
export async function PUT(request:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Inicia sesión para guardar.'},{status:401});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origen no permitido.'},{status:403});
 try{
 const body=await request.text();if(body.length>900000)return Response.json({error:'Archivo demasiado grande.'},{status:413});
 const parsed=JSON.parse(body);const result=workspaceSchema.safeParse(parsed.workspace);
 if(!result.success||!Number.isSafeInteger(parsed.revision)||parsed.revision<0)return Response.json({error:'Datos inválidos. Revisa el draft y los nombres de equipo.'},{status:400});
 const data=JSON.stringify(result.data);const db=getDb();
 const saved=parsed.revision===0?await db.prepare('INSERT INTO workspaces (user_id,data,revision) VALUES (?,?,1) ON CONFLICT(user_id) DO NOTHING').bind(user.userId,data).run():await db.prepare('UPDATE workspaces SET data = ?, revision = revision + 1 WHERE user_id = ? AND revision = ?').bind(data,user.userId,parsed.revision).run();
 if(!saved.meta.changes)return Response.json({error:'Otra pestaña guardó cambios. Exporta tu trabajo y recarga antes de continuar.'},{status:409});
 return Response.json({revision:parsed.revision+1});
 }catch(error){return Response.json({error:error instanceof SyntaxError?'JSON inválido.':'No se pudo guardar. Tu trabajo sigue en pantalla; puedes exportarlo.'},{status:error instanceof SyntaxError?400:503});}
}
