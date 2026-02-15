'use server';

import { ai } from '@/ai/genkit';
import { db } from '@/lib/firebase/admin';
import { monetizationPlans } from '@/lib/plans';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { z } from 'zod';

const RazorpayPaymentDetailsSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

const BasePaymentSchema = z.object({
  userId: z.string(),
  totalAmount: z.number().positive(),
  currency: z.string().default('INR'),
  paymentDetails: RazorpayPaymentDetailsSchema,
});

const CartItemSchema = z.object({
  productId: z.string(),
  name_en: z.string(),
  price: z.number(),
  quantity: z.number().min(1),
  imageUrl: z.string().optional(),
  shopId: z.string().optional(),
});

const SupportItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number().positive(),
  quantity: z.number().min(1),
});

const CartPaymentSchema = BasePaymentSchema.extend({
  context: z.literal('cart'),
  items: z.array(CartItemSchema).min(1),
});

const SupportPaymentSchema = BasePaymentSchema.extend({
  context: z.literal('support'),
  items: z.array(SupportItemSchema).min(1),
});

const FinalizePaymentInputSchema = z.discriminatedUnion('context', [
  CartPaymentSchema,
  SupportPaymentSchema,
]);

const FinalizePaymentOutputSchema = z.object({
  context: z.enum(['cart', 'support']),
  recordId: z.string(),
  status: z.literal('recorded'),
});

type CartPaymentInput = z.infer<typeof CartPaymentSchema>;
type SupportPaymentInput = z.infer<typeof SupportPaymentSchema>;

export type FinalizePaymentInput = z.infer<typeof FinalizePaymentInputSchema>;
export type FinalizePaymentOutput = z.infer<typeof FinalizePaymentOutputSchema>;

export async function finalizePayment(
  input: FinalizePaymentInput,
): Promise<FinalizePaymentOutput> {
  return finalizePaymentFlow(input);
}

const finalizePaymentFlow = ai.defineFlow(
  {
    name: 'finalizePaymentFlow',
    inputSchema: FinalizePaymentInputSchema,
    outputSchema: FinalizePaymentOutputSchema,
    authPolicy: (auth, input) => {
      if (!auth || auth.uid !== input.userId) {
        throw new Error('User must be authenticated to finalize payments.');
      }
    },
  },
  async (input) => {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      throw new Error('Razorpay credentials are not configured on the server.');
    }

    validateSignature(input.paymentDetails, secret);

    if (input.context === 'cart') {
      return finalizeCartOrder(input);
    }

    return finalizeSupportContribution(input);
  },
);

function validateSignature(
  paymentDetails: z.infer<typeof RazorpayPaymentDetailsSchema>,
  secret: string,
) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${paymentDetails.razorpay_order_id}|${paymentDetails.razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== paymentDetails.razorpay_signature) {
    throw new Error('Payment signature verification failed.');
  }
}

async function finalizeCartOrder(input: CartPaymentInput): Promise<FinalizePaymentOutput> {
  const cartCollection = db.collection('users').doc(input.userId).collection('cart');
  const cartSnapshot = await cartCollection.get();

  if (cartSnapshot.empty) {
    throw new Error('Cart is empty or has already been processed.');
  }

  const serverCartItems = cartSnapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    const fallback = input.items.find((item) => item.productId === docSnap.id);

    const price =
      typeof data.price === 'number'
        ? data.price
        : fallback?.price ?? 0;
    const quantity =
      typeof data.quantity === 'number'
        ? data.quantity
        : fallback?.quantity ?? 1;

    return {
      productId: data.productId ?? docSnap.id,
      name_en:
        typeof data.name_en === 'string'
          ? data.name_en
          : fallback?.name_en ?? 'Unknown item',
      price,
      quantity,
      imageUrl:
        typeof data.imageUrl === 'string'
          ? data.imageUrl
          : fallback?.imageUrl,
      shopId:
        typeof data.shopId === 'string'
          ? data.shopId
          : fallback?.shopId,
    };
  });

  const serverTotal = serverCartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  if (!Number.isFinite(serverTotal) || serverTotal <= 0) {
    throw new Error('Calculated cart total is invalid.');
  }

  if (Math.round(serverTotal * 100) !== Math.round(input.totalAmount * 100)) {
    throw new Error('Cart total mismatch detected. Aborting payment finalization.');
  }

  const batch = db.batch();
  const orderRef = db.collection('orders').doc();

  batch.set(orderRef, {
    id: orderRef.id,
    userId: input.userId,
    items: serverCartItems,
    totalAmount: serverTotal,
    currency: input.currency,
    status: 'paid',
    shopId: serverCartItems[0]?.shopId ?? input.items[0]?.shopId ?? 'default_shop',
    paymentGateway: 'razorpay',
    paymentGatewayId: input.paymentDetails.razorpay_order_id,
    paymentDetails: input.paymentDetails,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  cartSnapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));

  await batch.commit();

  return {
    context: 'cart',
    recordId: orderRef.id,
    status: 'recorded',
  };
}

async function finalizeSupportContribution(
  input: SupportPaymentInput,
): Promise<FinalizePaymentOutput> {
  const validatedItems = input.items.map((item) => {
    const plan = monetizationPlans.find((plan) => plan.id === item.id);
    if (!plan) {
      throw new Error(`Unknown contribution plan: ${item.id}`);
    }

    const amountPerUnit = plan.type === 'custom_donation' ? item.amount : plan.amount;
    if (!Number.isFinite(amountPerUnit) || amountPerUnit <= 0) {
      throw new Error(`Invalid amount provided for ${plan.name}.`);
    }

    return {
      id: plan.id,
      name: plan.name,
      planType: plan.type,
      quantity: item.quantity,
      amount: amountPerUnit,
    };
  });

  const serverTotal = validatedItems.reduce(
    (total, item) => total + item.amount * item.quantity,
    0,
  );

  if (Math.round(serverTotal * 100) !== Math.round(input.totalAmount * 100)) {
    throw new Error('Contribution total mismatch detected.');
  }

  const transactionRef = db.collection('transactions').doc();
  await transactionRef.set({
    id: transactionRef.id,
    userId: input.userId,
    items: validatedItems,
    totalAmount: serverTotal,
    currency: input.currency,
    status: 'completed',
    paymentGateway: 'razorpay',
    paymentGatewayId: input.paymentDetails.razorpay_order_id,
    paymentDetails: input.paymentDetails,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    context: 'support',
    recordId: transactionRef.id,
    status: 'recorded',
  };
}
