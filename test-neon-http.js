import { PrismaNeonHttp } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import fetch from 'node-fetch';
import dotenv from "dotenv";
import dns from 'node:dns';

// Fix for Node.js IPv6 ENETUNREACH/ETIMEDOUT issues
dns.setDefaultResultOrder('ipv4first');

// Override Neon's fetch with node-fetch which respects node:dns settings
neonConfig.fetchFunction = fetch;

dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const adapter = new PrismaNeonHttp(connectionString);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Connecting to database using Neon HTTP + node-fetch...");
    const user = await prisma.user.findUnique({
      where: { username: "alokvermax23" }
    });
    console.log("Result:", user);
  } catch (error) {
    console.error("Prisma Error:", error);
  } finally {
    process.exit(0);
  }
}

main();
