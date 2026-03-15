import { Router, raw } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as billingService from '../../services/billing.service.js';
import type { ApiResponse } from '@firasa/shared';

export const billingRouter = Router();

/** GET /api/v1/billing/pricing — Get tier pricing (public) */
billingRouter.get('/pricing', (_req, res) => {
  const pricing = billingService.getTierPricing();
  const response: ApiResponse<typeof pricing> = { success: true, data: pricing };
  res.json(response);
});

/** POST /api/v1/billing/checkout — Create Stripe checkout session */
billingRouter.post('/checkout', requireAuth, async (req, res) => {
  const { tier } = req.body;
  if (!tier || !['pro', 'premium'].includes(tier)) {
    res.status(400).json({ success: false, error: 'Invalid tier' });
    return;
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const url = await billingService.createCheckoutSession(
    req.user!.id,
    tier,
    `${baseUrl}/billing/success?tier=${tier}`,
    `${baseUrl}/billing/cancel`
  );

  res.json({ success: true, data: { url } });
});

/** POST /api/v1/billing/portal — Create Stripe customer portal session */
billingRouter.post('/portal', requireAuth, async (req, res) => {
  const returnUrl = req.body.returnUrl ?? `${req.protocol}://${req.get('host')}/settings`;
  const url = await billingService.createPortalSession(req.user!.id, returnUrl);
  res.json({ success: true, data: { url } });
});

/** POST /api/v1/billing/webhook — Stripe webhook handler */
billingRouter.post(
  '/webhook',
  raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) {
      res.status(400).json({ success: false, error: 'Missing signature' });
      return;
    }

    try {
      await billingService.handleWebhook(req.body, sig);
      res.json({ received: true });
    } catch (err) {
      console.error('[BILLING] Webhook error:', err);
      res.status(400).json({ success: false, error: 'Webhook processing failed' });
    }
  }
);
