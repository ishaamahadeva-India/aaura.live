import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { AdEventType } from '@/types/ad-analytics';
import { sendEmail } from '@/lib/notifications/email';
import { sendWebhookEvent } from '@/lib/notifications/webhook';

const DAILY_THRESHOLD = 2000;

const hashIp = (ip: string | null) => {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex');
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adId, type } = body as { adId?: string; type?: AdEventType };

    if (!adId || (type !== 'impression' && type !== 'click')) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const [collectionName, docId] = adId.split('/');
    if (!collectionName || !docId) {
      return NextResponse.json({ error: 'Invalid ad id' }, { status: 400 });
    }

    const adRef = db.collection(collectionName).doc(docId);
    const adSnap = await adRef.get();
    if (!adSnap.exists) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    const adData = adSnap.data();
    if (!adData?.active) {
      return NextResponse.json({ error: 'Ad not active' }, { status: 403 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.ip || null;
    const hashedIp = hashIp(ip);
    const userAgent = request.headers.get('user-agent') || '';

    const analyticsRef = adRef.collection('analytics').doc();
    await analyticsRef.set({
      type,
      occurredAt: new Date(),
      ipHash: hashedIp,
      userAgent,
    });

    const incrementField = type === 'impression' ? 'impressions' : 'clicks';
    await adRef.set(
      {
        [incrementField]: FieldValue.increment(1),
        lastTrackedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const currentCount = (adData[incrementField] || 0) + 1;
    const reachedDailyLimit = currentCount > DAILY_THRESHOLD;

    let exhausted = false;
    if (type === 'impression') {
      const impressionLimit = adData.impressionLimit || null;
      if (impressionLimit && currentCount >= impressionLimit) {
        await adRef.set(
          {
            active: false,
            status: 'completed',
            completedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        exhausted = true;
        const advertiserEmail = adData.advertiser?.email;
        if (advertiserEmail) {
          await sendEmail({
            to: advertiserEmail,
            subject: 'Aaura campaign completed',
            text: `Hi ${adData.advertiser?.contactName || adData.advertiser?.businessName || ''},

Your campaign "${adData.title}" has reached its booked impressions and is now completed.

Thank you for promoting with Aaura.`,
            html: `<p>Hi ${adData.advertiser?.contactName || adData.advertiser?.businessName || ''},</p>
<p>Your campaign <strong>${adData.title}</strong> has reached its booked impressions and is now completed.</p>
<p>Thank you for promoting with Aaura.</p>`,
          });
        }
        await sendWebhookEvent(adData.advertiserId, 'campaign.completed', {
          adId,
          title: adData.title,
        });
      }
    }

    return NextResponse.json({ ok: true, reachedDailyLimit, exhausted });
  } catch (error: any) {
    console.error('Ad tracking error', error);
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }
}
