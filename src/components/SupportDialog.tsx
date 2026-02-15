
'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Loader2, Flower, Plus, Minus } from 'lucide-react';
import { monetizationPlans, type Plan } from '@/lib/plans';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';
import { createPaymentOrder } from '@/ai/flows/create-payment-order';
import { finalizePayment } from '@/ai/flows/finalize-payment';
import { Label } from '@/components/ui/label';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { useRazorpay } from '@/hooks/use-razorpay';

interface SelectionState {
    [key: string]: {
        quantity: number;
        customAmount?: number;
    }
}

export function SupportDialog() {
  const { toast } = useToast();
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const [isOpen, setIsOpen] = useState(false);
  const [selection, setSelection] = useState<SelectionState>({});
  const [isProcessing, startProcessing] = useTransition();
  const { isReady: isRazorpayReady, error: razorpayError } = useRazorpay();

  const totalAmount = useMemo(() => {
    return Object.entries(selection).reduce((total, [planId, data]) => {
      const plan = monetizationPlans.find(p => p.id === planId);
      if (!plan) return total;
      
      if (plan.type === 'custom_donation') {
          return total + (data.customAmount || 0);
      }
      return total + (plan.amount * data.quantity);
    }, 0);
  }, [selection]);

  useEffect(() => {
    if (razorpayError) {
      toast({
        variant: 'destructive',
        title: 'Payment Gateway Error',
        description: razorpayError,
      });
    }
  }, [razorpayError, toast]);
  
  const handleSelectionChange = (plan: Plan, type: 'toggle' | 'increment' | 'decrement') => {
      setSelection(prev => {
          const newSelection = { ...prev };
          const currentData = newSelection[plan.id] || { quantity: 0, customAmount: plan.amount };
          
          if (type === 'toggle') {
              if (currentData.quantity > 0) {
                  delete newSelection[plan.id];
              } else {
                  newSelection[plan.id] = { quantity: 1, customAmount: plan.amount };
              }
          } else if (type === 'increment') {
              newSelection[plan.id] = { ...currentData, quantity: currentData.quantity + 1 };
          } else if (type === 'decrement') {
              const newQuantity = Math.max(0, currentData.quantity - 1);
              if (newQuantity === 0) {
                  delete newSelection[plan.id];
              } else {
                  newSelection[plan.id] = { ...currentData, quantity: newQuantity };
              }
          }

          return newSelection;
      })
  }

  const handleCustomAmountChange = (planId: string, amount: number) => {
      setSelection(prev => {
          const newSelection = { ...prev };
          if (newSelection[planId]) {
              newSelection[planId] = { ...newSelection[planId], customAmount: amount };
          } else {
              // If user types in custom amount before ticking the box, select it.
              newSelection[planId] = { quantity: 1, customAmount: amount };
          }
          return newSelection;
      })
  }

  const handlePayment = () => {
     if (!user) {
         toast({ variant: 'destructive', title: 'Please log in to proceed.' });
         return;
     }
     if (totalAmount <= 0) {
         toast({ variant: 'destructive', title: 'Please select an amount to contribute.' });
         return;
     }
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

     startProcessing(async () => {
         try {
            toast({ title: 'Initiating secure payment...', description: 'Please wait.' });

            const transactionItems = Object.entries(selection).map(([planId, data]) => {
                const plan = monetizationPlans.find(p => p.id === planId);
                if (!plan) {
                  throw new Error('Selected plan is no longer available.');
                }
                return {
                    id: plan.id,
                    name: plan.name,
                    quantity: data.quantity,
                    amount: plan.type === 'custom_donation' ? (data.customAmount || plan.amount) : plan.amount,
                };
            });

            if (transactionItems.length === 0) {
              throw new Error('Please select at least one plan to continue.');
            }

            const contributionTotal = transactionItems.reduce(
              (sum, item) => sum + item.amount * item.quantity,
              0,
            );
            
            const order = await createPaymentOrder({ items: transactionItems, currency: 'INR' });
            if (!order || !order.id) {
                throw new Error('Failed to create Razorpay order.');
            }

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: 'Support Aaura',
                description: 'Contribution to Aaura Platform',
                order_id: order.id,
                handler: async (response: RazorpaySuccessResponse) => {
                    try {
                      if (!response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) {
                        throw new Error('Invalid payment response.');
                      }

                      await finalizePayment({
                        context: 'support',
                        userId: user.uid,
                        items: transactionItems,
                        totalAmount: contributionTotal,
                        currency: order.currency || 'INR',
                        paymentDetails: {
                          razorpay_order_id: response.razorpay_order_id,
                          razorpay_payment_id: response.razorpay_payment_id,
                          razorpay_signature: response.razorpay_signature,
                        },
                      });

                      toast({ title: 'Thank you for your support!', description: 'Your contribution is greatly appreciated.' });
                      setIsOpen(false);
                      setSelection({});
                    } catch (handlerError: any) {
                      console.error('Support payment handler error:', handlerError);
                      toast({
                        variant: 'destructive',
                        title: 'Contribution Processing Error',
                        description: handlerError.message || 'Payment succeeded but recording failed. Please contact support.',
                      });
                    }
                },
                prefill: {
                    name: user.displayName || 'Aaura Supporter',
                    email: user.email || '',
                },
                theme: { color: '#E6E6FA' }
            } satisfies RazorpayOptions;
            
            if (!window.Razorpay) {
              throw new Error('Razorpay payment gateway is not loaded. Please refresh and try again.');
            }

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                toast({ variant: 'destructive', title: 'Payment Failed', description: response.error?.description || 'Payment could not be completed.' });
            });
            rzp.open();

         } catch (error: any) {
             console.error("Payment processing error:", error);
             toast({ variant: 'destructive', title: 'Payment Failed', description: error.message || 'An unknown error occurred.' });
         }
     })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
          <Flower className="mr-2 h-4 w-4" /> Support Us
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Support Aaura's Mission</DialogTitle>
          <DialogDescription>
            Your contribution helps us continue to provide and grow this spiritual resource for everyone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            {monetizationPlans.map((p) => {
                const currentSelection = selection[p.id];
                const isSelected = !!currentSelection;

                return (
                <Card 
                    key={p.id}
                    className={cn("transition-all", isSelected ? "border-primary ring-2 ring-primary/50" : "hover:border-primary/50")}
                >
                    <div className="flex items-start p-4">
                        <Checkbox 
                            id={p.id}
                            checked={isSelected}
                            onCheckedChange={() => handleSelectionChange(p, 'toggle')}
                            className="mr-4 mt-1"
                        />
                        <div className="flex-1">
                            <Label htmlFor={p.id} className="cursor-pointer">
                                <p className="font-semibold">{p.name}</p>
                                <p className="text-xs text-muted-foreground">{p.description}</p>
                            </Label>
                        </div>
                         <div className="text-right">
                            <p className="font-bold">₹{p.amount}</p>
                            {p.period === 'year' && <p className="text-xs text-muted-foreground">per year</p>}
                        </div>
                    </div>
                    {isSelected && (p.type === 'donation') && (
                        <CardContent className="pt-0 pl-12">
                             <div className="flex items-center gap-2">
                                <Label htmlFor={`quantity-${p.id}`} className="text-sm">Quantity:</Label>
                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleSelectionChange(p, 'decrement')}><Minus className="h-4 w-4"/></Button>
                                <span className="font-bold w-8 text-center">{currentSelection.quantity}</span>
                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleSelectionChange(p, 'increment')}><Plus className="h-4 w-4"/></Button>
                            </div>
                        </CardContent>
                    )}
                    {isSelected && p.type === 'custom_donation' && (
                        <CardContent className="pt-0 pl-12">
                            <div className="flex items-center gap-2">
                                <Label htmlFor={`amount-${p.id}`} className="text-sm">Amount (₹):</Label>
                                <Input
                                    id={`amount-${p.id}`}
                                    type="number"
                                    value={currentSelection.customAmount}
                                    onChange={(e) => handleCustomAmountChange(p.id, Number(e.target.value))}
                                    className="h-8 w-24"
                                    min={1}
                                />
                            </div>
                        </CardContent>
                    )}
                </Card>
            )})}
        </div>
        
        {totalAmount > 0 && (
            <>
            <Separator />
            <div className="flex justify-between items-center font-bold text-lg">
                <span>Total Contribution</span>
                <span>₹{totalAmount.toFixed(2)}</span>
            </div>
            </>
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={isProcessing || totalAmount === 0}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flower className="mr-2 h-4 w-4" />}
            Contribute ₹{totalAmount.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
