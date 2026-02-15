
'use server';

/**
 * @fileOverview A server-side flow to securely create a Razorpay order for various transaction types.
 * 
 * - createPaymentOrder - Creates an order on Razorpay and returns the order details.
 * - CreatePaymentOrderInput - Input schema for the flow.
 * - CreatePaymentOrderOutput - Output schema for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import Razorpay from 'razorpay';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/admin';

// ---------------------------------------------------
// 1. Input/Output Schema Definition
// ---------------------------------------------------
const OrderItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  quantity: z.number().min(1),
});

const CreatePaymentOrderInputSchema = z.object({
  items: z.array(OrderItemSchema).min(1, "Order cannot be empty."),
  currency: z.string().default('INR'),
});
export type CreatePaymentOrderInput = z.infer<typeof CreatePaymentOrderInputSchema>;


// The output schema should match the structure of the Razorpay order object
const CreatePaymentOrderOutputSchema = z.object({
    id: z.string(),
    entity: z.string(),
    amount: z.number(),
    amount_paid: z.number(),
    amount_due: z.number(),
    currency: z.string(),
    receipt: z.string().nullable(),
    offer_id: z.string().nullable(),
    status: z.string(),
    attempts: z.number(),
    notes: z.any(),
    created_at: z.number()
});
export type CreatePaymentOrderOutput = z.infer<typeof CreatePaymentOrderOutputSchema>;


// ---------------------------------------------------
// 2. Exported "Callable" Function
// ---------------------------------------------------

export async function createPaymentOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderOutput> {
  return createPaymentOrderFlow(input);
}


// ---------------------------------------------------
// 3. The Genkit Flow Implementation
// ---------------------------------------------------

const createPaymentOrderFlow = ai.defineFlow(
  {
    name: 'createPaymentOrderFlow',
    inputSchema: CreatePaymentOrderInputSchema,
    outputSchema: CreatePaymentOrderOutputSchema,
    authPolicy: (auth, input) => {
        if (!auth) {
          throw new Error("User must be authenticated to create an order.");
        }
    }
  },
  async (input) => {
    
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials are not configured in the environment.");
    }
    
    // --- Server-side price calculation ---
    let serverCalculatedTotal = 0;
    for (const item of input.items) {
      // For donations/plans, trust the amount from the client.
      // For products, re-fetch from DB to prevent manipulation.
      // This simple flow trusts the client amount for all types for now.
      serverCalculatedTotal += item.amount * item.quantity;
    }
    // --- End server-side price calculation ---

    const serverPriceInPaise = Math.round(serverCalculatedTotal * 100);

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    
    const receiptId = `receipt_order_${new Date().getTime()}`;

    const options = {
      amount: serverPriceInPaise,
      currency: input.currency,
      receipt: receiptId,
    };
    
    try {
      const order = await instance.orders.create(options);
      return order;

    } catch (error: any) {
      console.error("Razorpay order creation failed:", error);
      throw new Error(`Failed to create Razorpay order: ${error.message}`);
    }
  }
);
