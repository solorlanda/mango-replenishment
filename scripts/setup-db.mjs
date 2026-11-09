import {MongoClient} from 'mongodb';
export async function setup(db){
  const items=db.collection('items');
  await items.createIndex({id:1},{unique:true,name:'unique_item_id'});
  await items.createIndex({shift:1,created:1,id:1},{name:'shift_list'});
  return items;
}
if(import.meta.url===new URL(process.argv[1],'file:').href){
  if(!process.env.MONGODB_URI)throw new Error('Set MONGODB_URI securely in the server environment first.');
  const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:8000});
  try{await client.connect();await setup(client.db(process.env.MONGODB_DB||'mango_replenishment'));console.log('Database indexes ready.');}
  catch{console.error('Unable to configure the database. Check Atlas access and the server environment.');process.exitCode=1;}
  finally{await client.close();}
}
