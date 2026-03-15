import Stripe from 'stripe';
import { getDb } from './database.js';
import type { UserTier } from '@firasa/shared';

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' });
  }
  return stripe;
}

// Map tier to Stripe price IDs (configured at startup)
const TIER_PRICE_IDS: Record<Exclude<UserTier, 'free' | 'admin'>, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID ?? '',
  premium: process.env.STRIPE_PREMIUM_PRICE_ID ?? '',
};

export async function createCheckoutSession(
  userId: string,
  tier: 'pro' | 'premium',
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const db = getDb();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  const s = getStripe();

  // Find or create Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await s.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await s.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: TIER_PRICE_IDS[tier], quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, tier },
  });

  return session.url!;
}

export async function createPortalSession(userId: string, returnUrl: string): Promise<string> {
  const db = getDb();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  if (!user.stripeCustomerId) {
    throw Object.assign(new Error('No active subscription'), { statusCode: 400 });
  }

  const s = getStripe();
  const session = await s.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
  const s = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');

  const event = s.webhooks.constructEvent(rawBody, signature, webhookSecret);
  const db = getDb();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const tier = session.metadata?.tier as UserTier | undefined;
      if (userId && tier) {
        await db.user.update({
          where: { id: userId },
          data: {
            tier,
            stripeSubscriptionId: (session.subscription as string) ?? null,
          },
        });
        console.log(`[BILLING] User ${userId} upgraded to ${tier}`);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id;
      const newTier = Object.entries(TIER_PRICE_IDS).find(([, id]) => id === priceId)?.[0] as UserTier | undefined;
      if (newTier) {
        await db.user.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { tier: newTier },
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await db.user.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { tier: 'free', stripeSubscriptionId: null },
      });
      console.log(`[BILLING] Subscription ${sub.id} cancelled — downgraded to free`);
      break;
    }

    default:
      // Ignore other events
      break;
  }
}

export function getTierPricing(): { tier: string; monthlyPrice: number; features: string[] }[] {
  return [
    {
      tier: 'free',
      monthlyPrice: 0,
      features: [
        'Follow up to 3 gurus',
        '5 alerts per day',
        '7-day signal history',
        'Basic signal cards',
      ],
    },
    {
      tier: 'pro',
      monthlyPrice: 9.99,
      features: [
        'Follow up to 20 gurus',
        '50 alerts per day',
        '90-day signal history',
        'Trade tracker',
        'WhatsApp alerts',
        'API access',
      ],
    },
    {
      tier: 'premium',
      monthlyPrice: 29.99,
      features: [
        'Follow up to 100 gurus',
        '200 alerts per day',
        '1-year signal history',
        'Portfolio tracking',
        'Priority support',
        'Custom alerts',
        'Email digest',
      ],
    },
  ];
}
