import { PrismaClient } from '@firasa/database';

let prisma: PrismaClient | null = null;

export async function initDatabase(): Promise<PrismaClient> {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }

  return prisma;
}

export function getDb(): PrismaClient {
  if (!prisma) throw new Error('Call initDatabase() before getDb()');
  return prisma;
}
