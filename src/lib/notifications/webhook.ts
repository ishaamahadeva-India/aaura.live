'use server';

import crypto from 'crypto';
import { db } from '@/lib/firebase/admin';

const EVENT_MAP = new Set([
  'campaign.submitted',
  'campaign.approved',
  'campaign.rejected',
  'campaign.completed',
  'campaign.refunded',
  'wallet.topup',
]);

export async function sendWebhookEvent(userId: string, event: string, payload: any) {
  if (!EVENT_MAP.has(event)) return;
  const doc = await db.collection('advertiserWebhooks').doc(userId).get();
  if (!doc.exists) return;

  const config = doc.data();
  if (!config?.url) return;
  if (Array.isArray(config.events) && config.events.length > 0 && !config.events.includes(event)) {
    return;
  }
  const body = JSON.stringify({
    event,
    data: payload,
    sentAt: new Date().toISOString(),
  });

  const secret = config.secret || '';
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  try {
    await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Aaura-Signature': signature,
      },
      body,
    });
  } catch (error) {
    console.error('Webhook delivery failed', error);
  }
}
