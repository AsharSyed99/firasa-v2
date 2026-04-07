import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const deleted = await db.signal.deleteMany({});
console.log('Deleted', deleted.count, 'signals');
await db.$disconnect();
