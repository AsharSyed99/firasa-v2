import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // 1. Upgrade dev user to admin
  await db.user.updateMany({
    where: { firebaseUid: 'dev-user-001' },
    data: { tier: 'admin', displayName: 'Ashar', onboardingDone: true },
  });
  const user = await db.user.findFirst({ where: { firebaseUid: 'dev-user-001' } });
  console.log('✅ User upgraded to admin:', user?.id, user?.tier);

  // 2. Create ProblemSniper guru
  const existing = await db.guru.findFirst({ where: { twitterHandle: 'ProbsSniper' } });
  let guru;
  if (existing) {
    guru = existing;
    console.log('✅ ProblemSniper guru already exists:', guru.id);
  } else {
    guru = await db.guru.create({
      data: {
        twitterHandle: 'ProbsSniper',
        displayName: 'Problem Sniper',
        category: 'momentum',
        reliability: 0.75,
        isActive: true,
      },
    });
    console.log('✅ Created ProblemSniper guru:', guru.id);
  }

  // 3. Follow the guru
  if (user) {
    await db.userGuruConfig.upsert({
      where: { userId_guruId: { userId: user.id, guruId: guru.id } },
      create: { userId: user.id, guruId: guru.id, isFollowing: true, isMuted: false },
      update: { isFollowing: true, isMuted: false },
    });
    console.log('✅ Following ProblemSniper');

    // 4. Enable WhatsApp + set preferences
    await db.userPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        alertThreshold: 30,
        maxAlertsPerDay: 50,
        whatsappEnabled: true,
        whatsappNumber: '+17782284285',
        pushEnabled: true,
        emailEnabled: false,
        timezone: 'America/Los_Angeles',
      },
      update: {
        alertThreshold: 30,
        maxAlertsPerDay: 50,
        whatsappEnabled: true,
        whatsappNumber: '+17782284285',
        pushEnabled: true,
        timezone: 'America/Los_Angeles',
      },
    });
    console.log('✅ WhatsApp enabled for +17782284285');
  }

  // 5. Summary
  const gurus = await db.guru.findMany({ where: { isActive: true } });
  const configs = await db.userGuruConfig.findMany({ where: { userId: user?.id } });
  const prefs = await db.userPreference.findFirst({ where: { userId: user?.id } });
  console.log('\n--- Summary ---');
  console.log('Active gurus:', gurus.map(g => g.twitterHandle));
  console.log('Following:', configs.filter(c => c.isFollowing).length, 'gurus');
  console.log('WhatsApp:', prefs?.whatsappEnabled ? `ON (${prefs.whatsappNumber})` : 'OFF');
  console.log('Alert threshold:', prefs?.alertThreshold);
}

main().catch(console.error).finally(() => db.$disconnect());
