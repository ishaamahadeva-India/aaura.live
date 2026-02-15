
'use client';

import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { collection, doc, deleteDoc, updateDoc, type CollectionReference } from 'firebase/firestore';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Loader2, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { useTransition, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createPaymentOrder } from '@/ai/flows/create-payment-order';
import { finalizePayment } from '@/ai/flows/finalize-payment';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { useRazorpay } from '@/hooks/use-razorpay';

type CartItem = {
  productId: string;
  name_en: string;
  price: number;
  quantity: number;
  imageUrl: string;
  shopId?: string;
};

export default function CartPage() {
  const { t } = useLanguage();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [user, authLoading] = useAuthState(auth);
  const [isUpdating, startUpdateTransition] = useTransition();
  const [isCheckingOut, startCheckoutTransition] = useTransition();

  const cartRef = useMemo(() => {
    if (!user || !db) return undefined;
    return collection(db, 'users', user.uid, 'cart') as CollectionReference<CartItem>;
  }, [user, db]);

  const { isReady: isRazorpayReady, error: razorpayError } = useRazorpay();

  useEffect(() => {
    if (razorpayError) {
      toast({
        variant: 'destructive',
        title: 'Payment Gateway Error',
        description: razorpayError,
      });
    }
  }, [razorpayError, toast]);

  const [cartItems, cartLoading] = useCollectionData<CartItem>(cartRef, { idField: 'productId' });

  const totalAmount = cartItems?.reduce((total, item) => total + item.price * item.quantity, 0) || 0;

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (!user) return;
    if (newQuantity < 1) {
        handleRemoveFromCart(productId);
        return;
    }
    startUpdateTransition(async () => {
      try {
        const itemRef = doc(db, 'users', user.uid, 'cart', productId);
        await updateDoc(itemRef, { quantity: newQuantity });
      } catch (error: any) {
        console.error('Error updating quantity:', error);
        toast({ variant: 'destructive', title: 'Failed to update item quantity.' });
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${user.uid}/cart/${productId}`, operation: 'update', requestResourceData: { quantity: newQuantity }}));
      }
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    if (!user) return;
    startUpdateTransition(async () => {
      try {
        const itemRef = doc(db, 'users', user.uid, 'cart', productId);
        await deleteDoc(itemRef);
        toast({ title: 'Item removed from cart.' });
      } catch (error: any) {
        console.error('Error removing from cart:', error);
        toast({ variant: 'destructive', title: 'Failed to remove item.' });
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${user.uid}/cart/${productId}`, operation: 'delete'}));
      }
    });
  };

  const handleCheckout = async () => {
    if (!user || !cartItems || cartItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please add items to your cart before checkout.',
      });
      return;
    }

    // Check if Razorpay key is configured
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      toast({
        variant: 'destructive',
        title: 'Payment Gateway Error',
        description: 'Payment gateway is not configured. Please contact support.',
      });
      return;
    }

    if (!isRazorpayReady || typeof window === 'undefined' || !window.Razorpay) {
      toast({
        variant: 'destructive',
        title: 'Loading Payment Gateway...',
        description: 'Please wait a moment and try again.',
      });
      return;
    }

    startCheckoutTransition(async () => {
      try {
        toast({ title: 'Initiating secure payment...' });

        if (!cartItems || cartItems.length === 0) {
          throw new Error('Your cart is empty.');
        }

        const normalizedItems = cartItems.map((item) => {
          if (!item.productId || !item.name_en || !item.price || !item.quantity) {
            throw new Error(`Invalid item in cart: ${item.productId || 'unknown'}`);
          }
          return {
            productId: item.productId,
            name_en: item.name_en,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.imageUrl,
            shopId: item.shopId,
          };
        });

        const orderPayload = {
          items: normalizedItems.map((item) => ({
            id: item.productId,
            name: item.name_en,
            amount: item.price,
            quantity: item.quantity,
          })),
          currency: 'INR',
        };

        const checkoutTotal = normalizedItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );

        // Create payment order
        let order;
        try {
          order = await createPaymentOrder(orderPayload);
        } catch (orderError: any) {
          console.error('Payment order creation failed:', orderError);
          throw new Error(orderError.message || 'Failed to create payment order. Please try again.');
        }

        if (!order || !order.id) {
          throw new Error('Invalid payment order response. Please try again.');
        }

        // Validate order amount
        if (!order.amount || order.amount <= 0) {
          throw new Error('Invalid order amount. Please try again.');
        }
        
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency || 'INR',
          name: 'Aaura',
          description: `Payment for ${normalizedItems.length} item${normalizedItems.length > 1 ? 's' : ''}`,
          image: 'https://picsum.photos/seed/logo/128/128',
          order_id: order.id,
          handler: async function (response: RazorpaySuccessResponse) {
            try {
              if (!response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) {
                throw new Error('Invalid payment response.');
              }

              await finalizePayment({
                context: 'cart',
                userId: user.uid,
                items: normalizedItems,
                totalAmount: checkoutTotal,
                currency: order.currency || 'INR',
                paymentDetails: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              });

              toast({
                title: 'Payment Successful!',
                description: `Your order has been placed successfully.`,
              });
              router.push('/shop');
            } catch (handlerError: any) {
              console.error('Payment handler error:', handlerError);
              toast({
                variant: 'destructive',
                title: 'Order Processing Error',
                description: handlerError.message || 'Payment was successful but order processing failed. Please contact support with your payment ID.',
              });
            }
          },
          prefill: {
            name: user.displayName || 'Aaura User',
            email: user.email || '',
            contact: user.phoneNumber || '',
          },
          theme: {
            color: '#E6E6FA',
          },
          modal: {
            ondismiss: function () {
              toast({
                title: 'Payment Cancelled',
                description: 'You cancelled the payment process.',
              });
            },
          },
        } satisfies RazorpayOptions;

        if (!window.Razorpay) {
          throw new Error('Razorpay payment gateway is not loaded. Please refresh the page and try again.');
        }

        const rzp = new window.Razorpay(options);

        rzp.on('payment.failed', function (response: any) {
          console.error('Payment failed:', response);
          toast({
            variant: 'destructive',
            title: 'Payment Failed',
            description: response.error?.description || response.error?.reason || 'Payment could not be processed. Please try again.',
          });
        });

        rzp.on('payment.authorized', function (response: any) {
          console.log('Payment authorized:', response);
        });

        rzp.open();

      } catch (error: any) {
        console.error("Checkout failed:", error);
        toast({
            variant: 'destructive',
            title: 'Checkout Error',
            description: error.message || 'Could not initiate checkout. Please try again.',
        });
      }
    });
  };

  if (authLoading || cartLoading) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16 flex justify-center items-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart /> Your Shopping Cart
            </CardTitle>
            <CardDescription>
                Review the items in your cart before proceeding to checkout.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cartItems && cartItems.length > 0 ? (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between gap-4 p-2 rounded-md border">
                    <div className="flex items-center gap-4">
                        <div className="relative w-20 h-20 rounded-md overflow-hidden border">
                        <Image src={item.imageUrl} alt={item.name_en} fill className="object-cover" />
                        </div>
                        <div>
                        <h3 className="font-semibold">{item.name_en}</h3>
                         <div className="flex items-center gap-2 mt-1">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)} disabled={isUpdating}>
                                <Minus className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                             <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)} disabled={isUpdating}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="font-bold text-primary text-md mt-2">₹{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFromCart(item.productId)}
                      disabled={isUpdating}
                    >
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <ShoppingCart className="mx-auto h-24 w-24 opacity-30" />
                <p className="mt-4">Your cart is empty.</p>
              </div>
            )}
          </CardContent>
          {cartItems && cartItems.length > 0 && (
             <CardFooter className="flex-col items-stretch gap-4">
                <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                </div>
                <Button className="w-full" onClick={handleCheckout} disabled={isCheckingOut}>
                    {isCheckingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Proceed to Checkout
                </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </main>
  );
}
