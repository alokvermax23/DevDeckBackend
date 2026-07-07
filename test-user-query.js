import prisma from './src/config/db.js';

async function main() {
  try {
    console.log("Connecting to database and finding user...");
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
