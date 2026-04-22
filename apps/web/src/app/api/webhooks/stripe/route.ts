import { NextRequest, NextResponse } from 'next/server';
import { getStripe, PRICE_IDS } from '@/lib/stripe';
import { getDb } from '@/lib/server/db';

export const runtime = 'nodejs';

function tierFromPriceId(priceId: string): string {
  if (priceId === PRICE_IDS.pro) return 'pro';
  if (priceId === PRICE_IDS.premium) return 'premium';
  return 'free';
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = await getDb();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId && subscriptionId) {
          const sub = await getStripe().subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price?.id || '';
          const tier = tierFromPriceId(priceId);

          await db.execute(
            `UPDATE users SET tier = '${tier.replace(/'/g, "''")}', stripe_customer_id = '${customerId.replace(/'/g, "''")}', stripe_subscription_id = '${subscriptionId.replace(/'/g, "''")}', updated_at = datetime('now') WHERE id = '${userId.replace(/'/g, "''")}'`
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as any;
        const priceId = sub.items?.data?.[0]?.price?.id || '';
        const tier = tierFromPriceId(priceId);
        const subscriptionId = sub.id as string;

        await db.execute(
          `UPDATE users SET tier = '${tier.replace(/'/g, "''")}', updated_at = datetime('now') WHERE stripe_subscription_id = '${subscriptionId.replace(/'/g, "''")}'`
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const subscriptionId = sub.id as string;

        await db.execute(
          `UPDATE users SET tier = 'free', stripe_subscription_id = NULL, updated_at = datetime('now') WHERE stripe_subscription_id = '${subscriptionId.replace(/'/g, "''")}'`
        );
        break;
      }
    }
  } catch (err: any) {
    console.error('Stripe webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
