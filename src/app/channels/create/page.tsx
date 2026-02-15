'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Loader2, PlusCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/use-language';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';

const formSchema = z.object({
  name: z.string().min(3, { message: 'Channel name must be at least 3 characters.' }),
  description_en: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  description_hi: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  description_te: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateChannelPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const [user] = useAuthState(auth);
  const [isPending, startTransition] = useTransition();
  const { t } = useLanguage();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description_en: '',
      description_hi: '',
      description_te: '',
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'You must be logged in to create a channel.' });
      return;
    }

    startTransition(() => {
        const channelId = user.uid; // Use user's UID as channel ID for a 1-to-1 mapping
        const channelRef = doc(db, 'channels', channelId);

        const channelData = {
          id: channelId,
          userId: user.uid,
          name: data.name,
          description_en: data.description_en,
          description_hi: data.description_hi,
          description_te: data.description_te,
          creationDate: serverTimestamp(),
          subscriberCount: 0,
          totalViews: 0,
          totalLikes: 0,
        };

        setDoc(channelRef, channelData)
        .then(() => {
            toast({
                title: t.toasts.channelCreatedTitle,
                description: t.toasts.channelCreatedDescription,
            });
            router.push('/channels');
        })
        .catch(async (serverError) => {
             const permissionError = new FirestorePermissionError({
                path: channelRef.path,
                operation: 'create',
                requestResourceData: channelData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    });
  };

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16 flex justify-center">
      <div className="w-full max-w-2xl">
         <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>{t.createChannel.title}</CardTitle>
            <CardDescription>{t.createChannel.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.createChannel.nameLabel}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.createChannel.namePlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.createChannel.descriptionEnLabel}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t.createChannel.descriptionPlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  <FormField
                  control={form.control}
                  name="description_hi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.createChannel.descriptionHiLabel}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t.createChannel.descriptionPlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  <FormField
                  control={form.control}
                  name="description_te"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.createChannel.descriptionTeLabel}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t.createChannel.descriptionPlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                  )}
                  {t.createChannel.submitButton}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
