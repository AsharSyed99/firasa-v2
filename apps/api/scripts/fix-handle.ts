import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
await db.guru.updateMany({ where: { twitterHandle: 'ProbsSniper' }, data: { twitterHandle: 'ProblemSniper' } });
const g = await db.guru.findFirst({ where: { twitterHandle: 'ProblemSniper' } });
console.log('Fixed:', g?.twitterHandle, g?.id);
await db.$disconnect();
