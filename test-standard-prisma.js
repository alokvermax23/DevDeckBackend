import { PrismaClient } from '@prisma/client';
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
});

async function main() {
    try {
        const result = await prisma.$queryRaw`SELECT 1`;
        console.log('Database connected successfully with standard TCP engine:', result);
    } catch (error) {
        console.error('Database connection failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
