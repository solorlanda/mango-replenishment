import { MongoClient, type Collection } from 'mongodb';
export type Item = {id:string;shift:string;name:string;color:string;size:string;status:'pending'|'found'|'unavailable';archived:0|1;created:number};
const state = globalThis as typeof globalThis & { mangoMongo?: Promise<MongoClient> };
export async function getItems(): Promise<Collection<Item>> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured');
  if (!state.mangoMongo) {
    const client = new MongoClient(uri, {maxPoolSize:5,serverSelectionTimeoutMS:8000});
    state.mangoMongo = client.connect().catch(error => { state.mangoMongo=undefined; throw error; });
  }
  return (await state.mangoMongo).db(process.env.MONGODB_DB || 'mango_replenishment').collection<Item>('items');
}
