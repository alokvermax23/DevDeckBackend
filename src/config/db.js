import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import PrismaPkg from '@prisma/client';
const { PrismaClient } = PrismaPkg;
import dotenv from "dotenv";
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.warn("DATABASE_URL is not set in environment variables.");
}

const pool = new pg.Pool({ 
    connectionString,
    keepAlive: true,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;
