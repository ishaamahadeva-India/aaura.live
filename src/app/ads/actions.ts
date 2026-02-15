'use server';

import { z } from 'zod';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { auth, db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { AD_PACKAGE_MAP } from '@/data/ad-packages';
import { sendEmail } from '@/lib/notifications/email';
import { sendWebhookEvent } from '@/lib/notifications/webhook';
import type { AdCategory, AdCta, AdType, AdPackageSelection } from '@/types/ads';
import type { AdvertiserProfile } from '@/types/advertiser';

const AdvertiserSchema = z.object({
  businessName: z.string().min(2),
  contactName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  gstNumber: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
});

const PackageSelectionSchema = z.object({
  packageId: z.string(),
  quantity: z.number().int().positive(),
});

const CreativeSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  imageUrl: z.string().url(),
  videoUrl: z.string().url().optional(),
  link: z.string().url(),
  ctaLabel: z.string(),
  sponsoredBy: z.string().min(3),
  category: z.string(),
  type: z.string(),
  targetingSections: z.array(z.string()).optional(),
});

const verifyAuthToken = async (token: string) => {
  if (!token) {
    throw new Error('Missing auth token');
  }
  const decoded = await auth.verifyIdToken(token);
  return decoded.uid;
};

const computeTotalFromSelections = (selections: AdPackageSelection[]) => {
  return selections.reduce((sum, selection) => {
    const pkg = AD_PACKAGE_MAP[selection.packageId];
    if (!pkg) {
      throw new Error('Invalid package selection');
    }
    return sum + pkg.price * selection.quantity;
  }, 0);
};

const computeImpressionLimit = (selections: AdPackageSelection[]) => {
  return selections.reduce((sum, selection) => {
    const pkg = AD_PACKAGE_MAP[selection.packageId];
    if (!pkg) {
      throw new Error('Invalid package selection');
    }
    return sum + pkg.maxImpressions * selection.quantity;
  }, 0);
};

export async function createAdOrderAction(params: {
  authToken: string;
  packageSelections: AdPackageSelection[];
}) {
  const userId = await verifyAuthToken(params.authToken);
  const selections = PackageSelectionSchema.array().min(1).parse(params.packageSelections);

  const totalAmount = computeTotalFromSelections(selections);
  if (totalAmount <= 0) {
    throw new Error('Total amount must be greater than zero.');
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials missing.');
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const order = await razorpay.orders.create({
    amount: Math.round(totalAmount * 100),
    currency: 'INR',
    receipt: `ad_${userId}_${Date.now()}`,
  });

  return {
    orderId: order.id,
    currency: order.currency,
    amount: order.amount,
    calculatedTotal: totalAmount,
  };
}

export async function finalizeAdCampaignAction(params: {
  authToken: string;
  packageSelections: AdPackageSelection[];
  advertiser: AdvertiserProfile;
  creative: {
    title: string;
    description: string;
    imageUrl: string;
    videoUrl?: string;
    link: string;
    ctaLabel: AdCta;
    sponsoredBy: string;
    category: AdCategory;
    type: AdType;
    targetingSections?: string[];
  };
  payment: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    amount: number;
    currency: string;
  };
}) {
  const userId = await verifyAuthToken(params.authToken);
  const selections = PackageSelectionSchema.array().min(1).parse(params.packageSelections);
  const advertiser = AdvertiserSchema.parse(params.advertiser);
  const creative = CreativeSchema.parse(params.creative);
  const payment = params.payment;

  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay secret missing.');
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${payment.razorpay_order_id}|${payment.razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== payment.razorpay_signature) {
    throw new Error('Payment signature verification failed.');
  }

  const totalAmount = computeTotalFromSelections(selections);
  if (Math.round(totalAmount * 100) !== payment.amount) {
    throw new Error('Payment amount mismatch.');
  }
  const impressionLimit = computeImpressionLimit(selections);

  const collectionMap: Record<AdCategory, string> = {
    temple: 'templeAds',
    pooja: 'poojaAds',
    mandapa: 'mandapaAds',
  };
  const collectionName = collectionMap[creative.category];
  const adRef = db.collection(collectionName).doc();

  await adRef.set({
    id: adRef.id,
    title: creative.title,
    description: creative.description,
    imageUrl: creative.imageUrl,
    videoUrl: creative.videoUrl || null,
    link: creative.link,
    sponsoredBy: creative.sponsoredBy,
    active: false,
    status: 'pending_review',
    type: creative.type,
    category: creative.category,
    ctaLabel: creative.ctaLabel,
    advertiserId: userId,
    advertiser,
    packageSelections: selections,
    totalAmount,
    impressionLimit,
    impressions: 0,
    clicks: 0,
    targeting: {
      sections: creative.targetingSections || [],
    },
    priority: 0,
    paymentDetails: {
      orderId: payment.razorpay_order_id,
      paymentId: payment.razorpay_payment_id,
      currency: payment.currency,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await db
    .collection('advertiserCampaigns')
    .doc(adRef.id)
    .set({
      userId,
      advertiser,
      packageSelections: selections,
      totalAmount,
       creative: {
        title: creative.title,
        description: creative.description,
        link: creative.link,
        targetingSections: creative.targetingSections || [],
      },
      type: creative.type,
      category: creative.category,
      adPath: `${collectionName}/${adRef.id}`,
      status: 'pending_review',
      paymentMethod: 'razorpay',
      createdAt: FieldValue.serverTimestamp(),
    });

  if (advertiser.email) {
    const packageSummary = selections
      .map((selection) => {
        const pkg = AD_PACKAGE_MAP[selection.packageId];
        if (!pkg) return selection.packageId;
        return `${pkg.title} × ${selection.quantity}`;
      })
      .join(', ');

    await sendEmail({
      to: advertiser.email,
      subject: 'Aaura Ads – Campaign Received',
      text: `Hi ${advertiser.contactName || advertiser.businessName},

We received your campaign "${creative.title}" and payment of ₹${totalAmount.toLocaleString('en-IN')}.
Packages: ${packageSummary}
Razorpay Order ID: ${payment.razorpay_order_id}

Our reviewer will approve it shortly.
`,
      html: `<p>Hi ${advertiser.contactName || advertiser.businessName},</p>
<p>We received your campaign <strong>${creative.title}</strong> and payment of <strong>₹${totalAmount.toLocaleString('en-IN')}</strong>.</p>
<p><strong>Packages:</strong> ${packageSummary || 'N/A'}<br/>
<strong>Razorpay Order ID:</strong> ${payment.razorpay_order_id}</p>
<p>Our reviewer will approve it shortly.</p>`,
    });
  }

  await sendWebhookEvent(userId, 'campaign.submitted', {
    title: creative.title,
    totalAmount,
    paymentMethod: 'razorpay',
  });

  return { adId: adRef.id };
}

const WalletTopupSchema = z.object({
  amount: z.number().int().positive(),
});

async function ensureWalletDoc(userId: string) {
  const walletRef = db.collection('advertiserWallets').doc(userId);
  const snap = await walletRef.get();
  if (!snap.exists) {
    await walletRef.set({
      userId,
      balance: 0,
      currency: 'INR',
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  return walletRef;
}

export async function createWalletTopupOrderAction(params: { authToken: string; amount: number }) {
  const userId = await verifyAuthToken(params.authToken);
  const { amount } = WalletTopupSchema.parse(params);

  if (amount < 500 || amount > 500000) {
    throw new Error('Top-up must be between ₹500 and ₹500,000.');
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials missing.');
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: `wallet_${userId}_${Date.now()}`,
  });

  return { orderId: order.id, amount: order.amount, currency: order.currency };
}

export async function finalizeWalletTopupAction(params: {
  authToken: string;
  amount: number;
  payment: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    currency: string;
  };
}) {
  const userId = await verifyAuthToken(params.authToken);

  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay secret missing.');
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${params.payment.razorpay_order_id}|${params.payment.razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== params.payment.razorpay_signature) {
    throw new Error('Payment signature verification failed.');
  }

  const walletRef = await ensureWalletDoc(userId);
  await walletRef.set(
    {
      balance: FieldValue.increment(params.amount),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await walletRef.collection('transactions').add({
    type: 'topup',
    amount: params.amount,
    paymentId: params.payment.razorpay_payment_id,
    orderId: params.payment.razorpay_order_id,
    currency: params.payment.currency,
    createdAt: FieldValue.serverTimestamp(),
  });

  await sendWebhookEvent(userId, 'wallet.topup', {
    amount: params.amount,
    currency: params.payment.currency,
    paymentId: params.payment.razorpay_payment_id,
  });

  return { balance: params.amount };
}

export async function finalizeAdCampaignWithWalletAction(params: {
  authToken: string;
  packageSelections: AdPackageSelection[];
  advertiser: AdvertiserProfile;
  creative: {
    title: string;
    description: string;
    imageUrl: string;
    videoUrl?: string;
    link: string;
    ctaLabel: AdCta;
    sponsoredBy: string;
    category: AdCategory;
    type: AdType;
    targetingSections?: string[];
  };
}) {
  const userId = await verifyAuthToken(params.authToken);
  const selections = PackageSelectionSchema.array().min(1).parse(params.packageSelections);
  const advertiser = AdvertiserSchema.parse(params.advertiser);
  const creative = CreativeSchema.parse(params.creative);

  const totalAmount = computeTotalFromSelections(selections);
  const impressionLimit = computeImpressionLimit(selections);

  const walletRef = await ensureWalletDoc(userId);

  await db.runTransaction(async (transaction) => {
    const walletSnap = await transaction.get(walletRef);
    const walletData = walletSnap.data() || { balance: 0 };
    if ((walletData.balance || 0) < totalAmount) {
      throw new Error('Insufficient wallet balance.');
    }

    transaction.update(walletRef, {
      balance: FieldValue.increment(-totalAmount),
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.set(walletRef.collection('transactions').doc(), {
      type: 'debit',
      amount: totalAmount,
      description: `Campaign ${creative.title}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    const collectionMap: Record<AdCategory, string> = {
      temple: 'templeAds',
      pooja: 'poojaAds',
      mandapa: 'mandapaAds',
    };
    const collectionName = collectionMap[creative.category];
    const adRef = db.collection(collectionName).doc();

    transaction.set(adRef, {
      id: adRef.id,
      title: creative.title,
      description: creative.description,
      imageUrl: creative.imageUrl,
      videoUrl: creative.videoUrl || null,
      link: creative.link,
      sponsoredBy: creative.sponsoredBy,
      active: false,
      status: 'pending_review',
      type: creative.type,
      category: creative.category,
      ctaLabel: creative.ctaLabel,
      advertiserId: userId,
      advertiser,
      packageSelections: selections,
      totalAmount,
      impressionLimit,
      impressions: 0,
      clicks: 0,
      targeting: {
        sections: creative.targetingSections || [],
      },
      paymentDetails: {
        method: 'wallet',
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    transaction.set(db.collection('advertiserCampaigns').doc(adRef.id), {
      userId,
      advertiser,
      packageSelections: selections,
      totalAmount,
      creative: {
        title: creative.title,
        description: creative.description,
        link: creative.link,
        targetingSections: creative.targetingSections || [],
      },
      type: creative.type,
      category: creative.category,
      adPath: `${collectionName}/${adRef.id}`,
      status: 'pending_review',
      paymentMethod: 'wallet',
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await sendWebhookEvent(userId, 'campaign.submitted', {
    title: creative.title,
    totalAmount,
    paymentMethod: 'wallet',
  });

  if (advertiser.email) {
    const packageSummary = selections
      .map((selection) => {
        const pkg = AD_PACKAGE_MAP[selection.packageId];
        if (!pkg) return selection.packageId;
        return `${pkg.title} × ${selection.quantity}`;
      })
      .join(', ');

    await sendEmail({
      to: advertiser.email,
      subject: 'Aaura Ads – Campaign Received',
      text: `Hi ${advertiser.contactName || advertiser.businessName},

We received your campaign "${creative.title}" and deducted ₹${totalAmount.toLocaleString('en-IN')} from your Aaura wallet.
Packages: ${packageSummary}

Our reviewer will approve it shortly.`,
      html: `<p>Hi ${advertiser.contactName || advertiser.businessName},</p>
<p>We received your campaign <strong>${creative.title}</strong> and deducted <strong>₹${totalAmount.toLocaleString('en-IN')}</strong> from your Aaura wallet.</p>
<p><strong>Packages:</strong> ${packageSummary || 'N/A'}</p>
<p>Our reviewer will approve it shortly.</p>`,
    });
  }

  return { ok: true };
}

export async function saveWebhookConfigAction(params: {
  authToken: string;
  url: string;
  secret: string;
  events: string[];
}) {
  const userId = await verifyAuthToken(params.authToken);
  await db.collection('advertiserWebhooks').doc(userId).set(
    {
      url: params.url,
      secret: params.secret,
      events: params.events,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
