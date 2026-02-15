
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';

const formSchema = z.object({
  templeId: z.string().min(1, "A valid Temple ID from the database is required."),
  monthlyTarget: z.coerce.number().min(1000, "Target must be at least ₹1000."),
  bankAccountDetails: z.string().min(10, "Please provide valid bank account details for donations."),
  contactPerson: z.string().min(3, "Contact person's name is required."),
  phone: z.string().min(10, "A valid phone number is required."),
  description: z.string().min(20, "Please describe the maintenance needs."),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateMaintenanceFundPage() {
  const { toast } = useToast();
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const [isSubmitting, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      monthlyTarget: 5000,
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!auth.currentUser) {
      toast({ variant: 'destructive', title: 'Authentication Required', description: 'You must be logged in to create a fund. Please log in and try again.' });
      return;
    }

    startTransition(async () => {
      const user = auth.currentUser;
      if (!user || !db) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please ensure you are logged in and try again.' });
        return;
      }

      try {
        // Refresh auth token before submission
        try {
          await user.getIdToken(true);
        } catch (tokenError) {
          console.warn('Failed to refresh auth token', tokenError);
        }
      
        const fundData = {
          ...data,
          creatorId: user.uid,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          totalCollected: 0,
          donors: [],
          status: 'active'
        };

        await addDoc(collection(db, 'temple_maintenance_funds'), fundData);
        toast({ title: 'Maintenance Fund Created!', description: 'Your fund is now live for community contributions.' });
        router.push('/temples/seva');
      } catch (error: any) {
        console.error("Error creating fund:", error);
        const firebaseError = error as any;
        
        if (firebaseError?.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: 'temple_maintenance_funds',
            operation: 'create',
            requestResourceData: {},
          });
          errorEmitter.emit('permission-error', permissionError);
          toast({ 
            variant: 'destructive', 
            title: 'Permission Denied', 
            description: 'You do not have permission to create this fund. Please ensure you are logged in correctly and try again.' 
          });
        } else {
          toast({ 
            variant: 'destructive', 
            title: 'Creation Failed', 
            description: firebaseError?.message || 'Could not create the maintenance fund. Please try again or contact support if the issue persists.' 
          });
        }
      }
    });
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Temple Seva
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Create a Monthly Maintenance Fund</CardTitle>
            <CardDescription>Set up a recurring fund to cover the monthly operational costs of a temple.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                <FormField control={form.control} name="templeId" render={({ field }) => (
                  <FormItem><FormLabel>Temple ID</FormLabel><FormControl><Input placeholder="Enter the Temple's document ID" {...field} /></FormControl><FormDescription>This must be the ID of a temple already in the Aaura database.</FormDescription><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="monthlyTarget" render={({ field }) => (
                  <FormItem><FormLabel>Monthly Target (INR)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Maintenance Needs</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormDescription>Briefly describe what the monthly funds will be used for (e.g., electricity, cleaning, priest's salary).</FormDescription><FormMessage /></FormItem>
                )} />

                 <FormField control={form.control} name="bankAccountDetails" render={({ field }) => (
                  <FormItem><FormLabel>Bank Account Details for Donation</FormLabel><FormControl><Textarea placeholder="Bank Name, Account Number, IFSC Code" {...field} rows={3} /></FormControl><FormDescription>These details will be shown to users who wish to donate directly.</FormDescription><FormMessage /></FormItem>
                )} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="contactPerson" render={({ field }) => (
                        <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Fund
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
