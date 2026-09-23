import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB_NAME ?? "cg_job_care";
const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD;
const name = process.env.SUPER_ADMIN_NAME?.trim() || "Super Admin";

if (!uri || !email || !password) {
  console.error("Missing MONGODB_URI, SUPER_ADMIN_EMAIL, or SUPER_ADMIN_PASSWORD in .env.local.");
  process.exit(1);
}

if (password.length < 12) {
  console.error("SUPER_ADMIN_PASSWORD must be at least 12 characters long.");
  process.exit(1);
}

let client;

try {
  client = new MongoClient(uri);
  await client.connect();
  const users = client.db(databaseName).collection("users");
  await users.createIndex({ email: 1 }, { unique: true });
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();
  const result = await users.updateOne(
    { email },
    { $set: { name, email, passwordHash, role: "SUPER_ADMIN", businessVerticals: [], status: "ACTIVE", updatedAt: now }, $setOnInsert: { id: `ADM-${Date.now()}`, createdAt: now } },
    { upsert: true },
  );
  console.log(result.upsertedCount ? `Super Admin created for ${email}.` : `Super Admin credentials updated for ${email}.`);
} catch (error) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  console.error("Could not connect to MongoDB Atlas. No credentials were printed.");
  if (message.includes("authentication") || message.includes("auth failed")) console.error("Check the Atlas database username and password in MONGODB_URI.");
  else if (message.includes("connection string") || message.includes("uri") || message.includes("invalid scheme")) console.error("Check MONGODB_URI format. URL-encode special password characters such as @ as %40.");
  else if (message.includes("server selection") || message.includes("timed out") || message.includes("ip")) console.error("Check Atlas Network Access and allow your current IP address.");
  else if (message.includes("enotfound") || message.includes("querysrv")) console.error("Check the Atlas cluster hostname and DNS/network connection.");
  else console.error("Check Atlas Network Access, the cluster hostname, and the database user permissions.");
  process.exitCode = 1;
} finally {
  await client?.close();
}
