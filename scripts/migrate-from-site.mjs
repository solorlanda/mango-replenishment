import {MongoClient} from 'mongodb';
import {writeFile} from 'node:fs/promises';
import {z} from 'zod';
import {setup} from './setup-db.mjs';
// Run outside the web app. This command never deletes or writes to the old Site.
const args=Object.fromEntries(process.argv.slice(2).map((a,i,all)=>a.startsWith('--')?[a.slice(2),all[i+1]]:null).filter(Boolean));
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
if(!validDate(args.from)||!validDate(args.to)||args.from>args.to)throw Error('Usage: npm run migrate -- --from YYYY-MM-DD --to YYYY-MM-DD [--write] [--backup /private/path/backup.json]');
const source=new URL(process.env.SOURCE_SITE_URL||'https://mango-replenishment-sol.floralfrog3.chatgpt.site');
if(source.protocol!=='https:')throw Error('The source URL must use HTTPS.');
const item=z.object({id:z.string().uuid(),shift:z.string(),name:z.string().min(1).max(100),color:z.string().min(1).max(60),size:z.string().min(1).max(15),status:z.enum(['pending','found','unavailable']),archived:z.union([z.literal(0),z.literal(1)]),created:z.number().int().nonnegative()});
const rows=[];
let day=new Date(args.from+'T00:00:00Z');
let requests=0;
while(day.toISOString().slice(0,10)<=args.to){
  if(++requests>3660)throw Error('Choose a range shorter than 10 years.');
  for(const turn of ['Mañana','Tarde']){
    const shift=day.toISOString().slice(0,10)+' · '+turn;
    const url=new URL('/api/items',source);url.searchParams.set('shift',shift);
    const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{accept:'application/json'}});
    if(!response.ok)throw Error('A source request failed. No records were imported.');
    const records=z.array(item).parse(await response.json());
    if(records.some(record=>record.shift!==shift))throw Error('Unexpected shift returned. No records were imported.');
    rows.push(...records);
  }
  day.setUTCDate(day.getUTCDate()+1);
}
if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Duplicate IDs found. No records were imported.');
if(args.backup)await writeFile(args.backup,JSON.stringify(rows,null,2),{mode:0o600,flag:'wx'});
console.log(`Source checked: ${rows.length} records, including ${rows.filter(r=>r.archived).length} archived records.`);
if(!Object.hasOwn(args,'write')){
  console.log('Dry run only. Add --write to import after pausing updates on the old Site.');
}else{
  if(!process.env.MONGODB_URI)throw Error('Set MONGODB_URI securely before importing.');
  const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:8000});
  try{
    await client.connect();const collection=await setup(client.db(process.env.MONGODB_DB||'mango_replenishment'));
    if(rows.length)await collection.bulkWrite(rows.map(row=>({updateOne:{filter:{id:row.id},update:{$setOnInsert:row},upsert:true}})),{ordered:true});
    // Safe on repeat: matching existing records are preserved. Stop on conflicts
    // rather than overwriting changes already made in the destination.
    for(const row of rows){
      const stored=await collection.findOne({id:row.id},{projection:{_id:0}});
      if(!stored||Object.keys(row).some(k=>stored[k]!==row[k]))throw Error('Verification found a missing or conflicting record. Do not switch the team to the new URL.');
    }
    console.log(`Verified ${rows.length} records in MongoDB. The source Site was not changed.`);
  }finally{await client.close();}
}
