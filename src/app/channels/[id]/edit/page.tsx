'use client';

import { useTransition, useEffect, useState } from 'react';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { useLanguage } from '@/hooks/use-language';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { useMemo } from 'react';

const formSchema = z.object({
  name: z.string().min(3, { message: 'Channel name must be at least 3 characters.' }),
  description_en: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  description_hi: z.string().optional(),
  description_te: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditChannelPage() {
  const router = useRouter();
  const params = useParams();
  const channelId = params.id as string;
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const [user] = useAuthState(auth);
  const [isPending, startTransition] = useTransition();
  const { t } = useLanguage();
  const [isClient, setIsClient] = useState(false);

  const channelRef = useMemo(() => doc(db, 'channels', channelId), [db, channelId]);
  const [channel, loadingChannel] = useDocumentData(channelRef);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description_en: '',
      description_hi: '',
      description_te: '',
    },
  });

  // Update form when channel data loads
  useEffect(() => {
    if (channel) {
      form.reset({
        name: channel.name || '',
        description_en: channel.description_en || '',
        description_hi: channel.description_hi || '',
        description_te: channel.description_te || '',
      });
    }
  }, [channel, form]);

  // Check if user is the owner
  const isOwner = user?.uid === channelId;

  useEffect(() => {
    if (isClient && !loadingChannel && channel && !isOwner) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You can only edit your own channel.',
      });
      router.push(`/channels/${channelId}`);
    }
  }, [isClient, loadingChannel, channel, isOwner, router, channelId, toast]);

  const onSubmit = (data: FormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'You must be logged in to edit a channel.' });
      return;
    }

    if (!isOwner) {
      toast({ variant: 'destructive', title: 'You can only edit your own channel.' });
      return;
    }

    startTransition(() => {
      const channelRef = doc(db, 'channels', channelId);

      const channelData = {
        name: data.name,
        description_en: data.description_en,
        description_hi: data.description_hi || '',
        description_te: data.description_te || '',
        updatedAt: serverTimestamp(),
      };

      updateDoc(channelRef, channelData)
        .then(() => {
          toast({
            title: 'Channel Updated!',
            description: 'Your channel has been successfully updated.',
          });
          router.push(`/channels/${channelId}`);
        })
        .catch(async (serverError) => {
          console.error('Error updating channel:', serverError);
          const permissionError = new FirestorePermissionError({
            path: channelRef.path,
            operation: 'update',
            requestResourceData: channelData,
          });
          errorEmitter.emit('permission-error', permissionError);
          toast({
            variant: 'destructive',
            title: 'Failed to update channel',
            description: 'Please try again.',
          });
        });
    });
  };

  if (!isClient || loadingChannel) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16 flex justify-center items-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </main>
    );
  }

  if (!channel) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-destructive mb-2">Channel Not Found</h2>
            <p className="text-muted-foreground mb-4">The channel you're looking for doesn't exist.</p>
            <Button onClick={() => router.push('/channels')}>Back to Channels</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isOwner) {
    return null; // Will redirect via useEffect
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
      <div className="max-w-2xl mx-auto">
        <Button variant="outline" onClick={() => router.push(`/channels/${channelId}`)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Channel
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Edit Channel</CardTitle>
            <CardDescription>Update your channel information and description.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Channel Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter channel name" {...field} />
                      </FormControl>
                      <FormDescription>This will be displayed as your channel name.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (English)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your channel..." 
                          rows={6}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>Tell viewers about your channel and what content they can expect.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description_hi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Hindi)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="अपने चैनल के बारे में बताएं..." 
                          rows={6}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>Optional: Hindi description for your channel.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description_te"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Telugu)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="మీ ఛానెల్ గురించి చెప్పండి..." 
                          rows={6}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>Optional: Telugu description for your channel.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-4">
                  <Button type="submit" className="flex-1" disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.push(`/channels/${channelId}`)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

