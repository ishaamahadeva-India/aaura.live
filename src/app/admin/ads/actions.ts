"use server";

import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmail } from '@/lib/notifications/email';
import { sendWebhookEvent } from '@/lib/notifications/webhook';
import Razorpay from 'razorpay';

interface UpdateCampaignParams {
  campaignId: string;
  adPath: string;
  status: 'approved' | 'rejected';
  reason?: string;
}

export async function updateCampaignStatusAction(params: UpdateCampaignParams) {
  const { campaignId, adPath, status, reason } = params;
  const [collectionName, docId] = adPath.split('/');
  if (!collectionName || !docId) {
    throw new Error('Invalid ad path');
  }

  const adRef = db.collection(collectionName).doc(docId);
  const campaignRef = db.collection('advertiserCampaigns').doc(campaignId);

  const [adSnap, campaignSnap] = await Promise.all([adRef.get(), campaignRef.get()]);
  if (!adSnap.exists || !campaignSnap.exists) {
    throw new Error('Campaign or ad not found');
  }

  const campaignData = campaignSnap.data() || {};
  const advertiser = campaignData.advertiser || {};
  const email = advertiser.email;

  if (status === 'approved') {
    await Promise.all([
      adRef.set(
        {
          active: true,
          status: 'approved',
          priority: 10,
          approvedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
      campaignRef.set(
        {
          status: 'approved',
          approvedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    ]);

    if (email) {
      await sendEmail({
        to: email,
        subject: 'Your Aaura campaign is live!',
        text: `Hi ${advertiser.contactName || advertiser.businessName || ''},\n\nYour campaign "${campaignData?.creative?.title || 'Sponsored Ad'}" has been approved and is now live on Aaura.\n\nThank you for promoting with us.`,
        html: `<p>Hi ${advertiser.contactName || advertiser.businessName || ''},</p><p>Your campaign <strong>${campaignData?.creative?.title || 'Sponsored Ad'}</strong> has been approved and is now live on Aaura.</p><p>Thank you for promoting with us.</p>`,
      });
    }
    await sendWebhookEvent(campaignData.userId, 'campaign.approved', {
      campaignId,
      title: campaignData?.creative?.title,
    });
  } else {
    await Promise.all([
      adRef.set(
        {
          active: false,
          status: 'rejected',
          rejectionReason: reason || null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
      campaignRef.set(
        {
          status: 'rejected',
          rejectionReason: reason || null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    ]);

    if (email) {
      await sendEmail({
        to: email,
        subject: 'Campaign requires changes',
        text: `Hi ${advertiser.contactName || advertiser.businessName || ''},\n\nUnfortunately your campaign "${campaignData?.creative?.title || 'Sponsored Ad'}" was not approved. ${reason ? `Reason: ${reason}` : ''}\nPlease update the creative and resubmit.`,
        html: `<p>Hi ${advertiser.contactName || advertiser.businessName || ''},</p><p>Unfortunately your campaign <strong>${campaignData?.creative?.title || 'Sponsored Ad'}</strong> was not approved.${reason ? `<br/><strong>Reason:</strong> ${reason}` : ''}</p><p>Please update the creative and resubmit.</p>`,
      });
    }
    await sendWebhookEvent(campaignData.userId, 'campaign.rejected', {
      campaignId,
      title: campaignData?.creative?.title,
      reason: reason || null,
    });
  }
}

interface RefundCampaignParams {
  campaignId: string;
  adPath: string;
  reason?: string;
}

export async function requestRefundAction({ campaignId, adPath, reason }: RefundCampaignParams) {
  const [collectionName, docId] = adPath.split('/');
  if (!collectionName || !docId) {
    throw new Error('Invalid ad path');
  }

  const adRef = db.collection(collectionName).doc(docId);
  const campaignRef = db.collection('advertiserCampaigns').doc(campaignId);
  const [adSnap, campaignSnap] = await Promise.all([adRef.get(), campaignRef.get()]);

  if (!adSnap.exists || !campaignSnap.exists) {
    throw new Error('Campaign or ad not found');
  }

  const adData = adSnap.data() || {};
  const campaignData = campaignSnap.data() || {};

  if (adData.refund?.status === 'processed') {
    throw new Error('Refund already processed.');
  }

  if (!adData.paymentDetails?.paymentId) {
    throw new Error('No payment information available for this campaign.');
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials missing.');
  }

  const amount = Math.round((adData.totalAmount || 0) * 100);
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const refund = await razorpay.payments.refund(adData.paymentDetails.paymentId, {
    amount,
    speed: 'optimum',
    notes: { campaignId, reason: reason || '' },
  });

  await Promise.all([
    adRef.set(
      {
        active: false,
        status: 'refunded',
        refund: {
          status: 'processed',
          amount: amount / 100,
          receiptId: refund.id,
          processedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
    campaignRef.set(
      {
        status: 'refunded',
        refund: {
          status: 'processed',
          amount: amount / 100,
          reason: reason || null,
          processedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    ),
  ]);

  const advertiser = campaignData.advertiser || {};
  if (advertiser.email) {
    await sendEmail({
      to: advertiser.email,
      subject: 'Aaura Ads – Refund processed',
      text: `Hi ${advertiser.contactName || advertiser.businessName || ''},

We processed a refund of ₹${(amount / 100).toLocaleString('en-IN')} for your campaign "${campaignData?.creative?.title || adData.title}".
${reason ? `Reason: ${reason}` : ''}

It may take 5-7 business days for the amount to reflect.`,
      html: `<p>Hi ${advertiser.contactName || advertiser.businessName || ''},</p>
<p>We processed a refund of <strong>₹${(amount / 100).toLocaleString('en-IN')}</strong> for your campaign <strong>${campaignData?.creative?.title || adData.title}</strong>.</p>
${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
<p>It may take 5-7 business days for the amount to reflect.</p>`,
    });
  }

  await sendWebhookEvent(campaignData.userId, 'campaign.refunded', {
    campaignId,
    amount: amount / 100,
    reason: reason || null,
  });
}
