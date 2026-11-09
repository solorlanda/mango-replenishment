import {z} from 'zod';
import {getItems,type Item} from '../../../lib/mongodb';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const shiftSchema=z.string().regex(/^\d{4}-\d{2}-\d{2} · (Mañana|Tarde)$/);
const schema=z.discriminatedUnion('action',[
  z.object({action:z.literal('add'),shift:shiftSchema,name:z.string().trim().min(1).max(100),color:z.string().trim().min(1).max(60),sizes:z.array(z.string().trim().min(1).max(15)).min(1).max(30)}),
  z.object({action:z.literal('status'),id:z.string().uuid(),status:z.enum(['pending','found','unavailable'])}),
  z.object({action:z.literal('archive'),shift:shiftSchema}),
]);
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
  const shift=shiftSchema.safeParse(new URL(request.url).searchParams.get('shift'));
  if(!shift.success)return json({error:'A valid shift is required.'},400);
  try {
    const items=await getItems();
    return json(await items.find({shift:shift.data},{projection:{_id:0}}).sort({created:1,id:1}).toArray());
  } catch {return json({error:'Unable to load the shift. Please try again.'},503);}
}
export async function POST(request:Request){
  // The app intentionally supports public link access, as requested. Do not
  // enable browser cross-origin writes or expose the database URI to clients.
  const origin=request.headers.get('origin');
  const expected=process.env.APP_ORIGIN || new URL(request.url).origin;
  if(origin && origin!==expected)return json({error:'Origin not allowed.'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'JSON required.'},415);
  let body:unknown;
  try {body=await request.json();}catch{return json({error:'Invalid request.'},400);}
  const parsed=schema.safeParse(body);
  if(!parsed.success)return json({error:'Please check the product, colour and sizes.'},400);
  try {
    const data=parsed.data;
    const items=await getItems();
    if(data.action==='add'){
      const records:Item[]=[...new Set(data.sizes)].map(size=>({id:crypto.randomUUID(),shift:data.shift,name:data.name,color:data.color,size,status:'pending',archived:0,created:Date.now()}));
      await items.insertMany(records);
    }else if(data.action==='status'){
      const result=await items.updateOne({id:data.id,archived:0},{$set:{status:data.status}});
      if(!result.matchedCount)return json({error:'This size was archived or no longer exists. Refresh the list.'},404);
    }else{
      await items.updateMany({shift:data.shift,archived:0,status:{$in:['found','unavailable']}},{$set:{archived:1}});
    }
    return json({ok:true});
  }catch{return json({error:'Unable to save. Please try again.'},503);}
}
