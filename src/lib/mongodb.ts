import { ClientSession, Db, MongoClient } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & { mongoClientPromise?: Promise<MongoClient>; mongoSetupPromise?: Promise<void> };

function getClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured.");
  if (!globalForMongo.mongoClientPromise) globalForMongo.mongoClientPromise = new MongoClient(uri, { maxPoolSize: 20, minPoolSize: 2, serverSelectionTimeoutMS: 5000 }).connect();
  return globalForMongo.mongoClientPromise;
}

export async function getDatabase(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB_NAME ?? "cg_job_care");
}

export async function ensureMongoSetup() {
  if (!globalForMongo.mongoSetupPromise) globalForMongo.mongoSetupPromise = setupDatabase();
  return globalForMongo.mongoSetupPromise;
}

async function setupDatabase() {
  const db = await getDatabase();
  await Promise.all([
    db.collection("candidates").createIndex({ mobile: 1 }, { unique: true }),
    db.collection("candidates").createIndex({ email: 1 }, { unique: true, sparse: true }),
    db.collection("applications").createIndex({ candidateId: 1, jobId: 1 }, { unique: true }),
    db.collection("jobs").createIndex({ status: 1, city: 1, postedAt: -1 }),
    db.collection("jobs").createIndex({ businessVertical: 1, status: 1, postedAt: -1 }),
    db.collection("jobs").createIndex({ title: "text", company: "text", category: "text" }),
    db.collection("employerRequirements").createIndex({ status: 1, createdAt: -1 }),
    db.collection("employerRequirements").createIndex({ businessVertical: 1, status: 1, createdAt: -1 }),
    db.collection("serviceRequests").createIndex({ status: 1, createdAt: -1 }),
    db.collection("serviceRequests").createIndex({ serviceType: 1, status: 1, createdAt: -1 }),
    db.collection("serviceReviews").createIndex({ serviceSlug: 1, status: 1, createdAt: -1 }),
    db.collection("announcements").createIndex({ active: 1, createdAt: -1 }),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("savedJobs").createIndex({ candidateId: 1, jobId: 1 }, { unique: true }),
    db.collection("candidateDocuments").createIndex({ candidateId: 1, type: 1 }, { unique: true }),
    db.collection("candidatePrivacyRequests").createIndex({ id: 1 }, { unique: true }),
    db.collection("candidatePrivacyRequests").createIndex({ status: 1, createdAt: -1 }),
    db.collection("candidatePrivacyRequests").createIndex({ candidateId: 1, createdAt: -1 }),
    db.collection("candidateEducations").createIndex({ candidateId: 1 }),
    db.collection("candidateExperiences").createIndex({ candidateId: 1 }),
    db.collection("notificationReads").createIndex({ candidateId: 1, notificationId: 1 }, { unique: true }),
    db.collection("settings").createIndex({ key: 1 }, { unique: true }),
    db.collection("interviews").createIndex({ status: 1, scheduledAt: 1 }),
    db.collection("auditLogs").createIndex({ action: 1, createdAt: -1 }),
    db.collection("auditLogs").createIndex({ actorId: 1, createdAt: -1 }),
  ]);
}

export async function pingDatabase() {
  const db = await getDatabase();
  await db.command({ ping: 1 });
}

export async function withMongoTransaction<T>(work: (db: Db, session: ClientSession) => Promise<T>): Promise<T> {
  const client = await getClient();
  const session = client.startSession();
  let result: T | undefined;
  try {
    await session.withTransaction(async () => {
      result = await work(client.db(process.env.MONGODB_DB_NAME ?? "cg_job_care"), session);
    });
  } finally {
    await session.endSession();
  }
  if (result === undefined) throw new Error("TRANSACTION_ABORTED");
  return result;
}
