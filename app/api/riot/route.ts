import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {champions} from '../../../lib/draft';
import {z} from 'zod';
const regions:Record<string,string>={la2:'americas',la1:'americas',br1:'americas',na1:'americas',euw1:'europe',eun1:'europe',tr1:'europe',ru:'europe',kr:'asia',jp1:'asia',oc1:'sea',sg2:'sea',tw2:'sea',vn2:'sea'};
// ponytail: per-isolate cooldown and bounded cache; use a shared limiter before widening site access.
const last=new Map<string,number>();
const cache=new Map<string,{until:number;value:unknown}>();
export async function GET(){return Response.json({configured:!!(env.RIOT_API_KEY||process.env.RIOT_API_KEY)},{headers:{'Cache-Control':'no-store'}});}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Inicia sesión para consultar Riot.'},{status:401});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origen no permitido.'},{status:403});
 const key=env.RIOT_API_KEY||process.env.RIOT_API_KEY;if(!key)return Response.json({error:'La conexión Riot todavía no está configurada en el servidor.'},{status:503});
 try{
 const body=await request.text();if(body.length>1000)return Response.json({error:'Consulta demasiado larga.'},{status:400});
 const {riotId,platform}=JSON.parse(body);
 if(typeof riotId!=='string'||!/^.{3,16}#[a-zA-Z0-9]{3,5}$/.test(riotId)||typeof platform!=='string'||!Object.hasOwn(regions,platform))return Response.json({error:'Introduce un Riot ID válido, por ejemplo Nombre#LAS, y su región.'},{status:400});
 const cacheKey=`${platform}:${riotId.toLowerCase()}`;const hit=cache.get(cacheKey);if(hit&&hit.until>Date.now())return Response.json(hit.value);
 if(Date.now()-(last.get(user.userId)??0)<1500)return Response.json({error:'Espera un momento antes de volver a consultar.'},{status:429});
 if(last.size>200)last.clear();last.set(user.userId,Date.now());
 async function riot(url:string){const r=await fetch(url,{headers:{'X-Riot-Token':key!},signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error(String(r.status));return r.json();}
 const [name,tag]=riotId.split('#');const account=z.object({puuid:z.string().min(1),gameName:z.string(),tagLine:z.string()}).parse(await riot(`https://${regions[platform]}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`));
 const mastery=await riot(`https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(account.puuid)}/top?count=15`);
 if(!Array.isArray(mastery))throw new Error('502');
 const value={riotId:`${account.gameName}#${account.tagLine}`,source:'Riot · maestría acumulada',champions:mastery.map((m:{championId:number;championLevel:number;championPoints:number})=>({id:champions.find(c=>c.key===String(m.championId))?.id,level:m.championLevel,points:m.championPoints})).filter(m=>m.id)};
 if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(cacheKey,{until:Date.now()+300000,value});return Response.json(value);
 }catch(e){const code=e instanceof Error?e.message:''; const messages:Record<string,string>={'403':'Riot rechazó la clave. Revisa si expiró o si tiene acceso.','401':'Riot no aceptó la clave configurada.','404':'Cuenta no encontrada o sin maestrías en esa región.','429':'Riot alcanzó su límite de consultas. Intenta más tarde.'};return Response.json({error:messages[code]??'No se pudo consultar Riot. Revisa los datos e intenta nuevamente.'},{status:code==='404'?404:code==='429'?429:502});}
}
