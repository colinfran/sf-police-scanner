import { MongoClient, type Db } from "mongodb";
import type { Call, SyncState } from "./types";

const g = globalThis as unknown as {
  _mongoClient?: Promise<MongoClient>;
  _mongoIndexes?: Promise<unknown>;
};

async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  g._mongoClient ??= new MongoClient(uri).connect().catch((err) => {
    g._mongoClient = undefined;
    throw err;
  });
  const db = (await g._mongoClient).db("sf_police_scanner");

  g._mongoIndexes ??= Promise.all([
    db.collection("calls").createIndex({ id: 1 }, { unique: true }),
    db.collection("calls").createIndex({ received_date: 1, received_datetime: -1 }),
  ]).catch((err) => {
    g._mongoIndexes = undefined;
    throw err;
  });
  await g._mongoIndexes;

  return db;
}

export async function collections() {
  const db = await getDb();
  return {
    calls: db.collection<Call>("calls"),
    meta: db.collection<SyncState>("meta"),
  };
}
