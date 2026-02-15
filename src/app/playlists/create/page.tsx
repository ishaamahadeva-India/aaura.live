
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Loader2, PlusCircle, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { useLanguage } from '@/hooks/use-language';
import Link from 'next/link';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  description: z.string().optional(),
  category: z.enum(["Deities", "Stories", "Rituals", "Festivals", "Peace", "Devotion"]),
  isPublic: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreatePlaylistPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const [user, loadingUser] = useAuthState(auth);
  const [isPending, startTransition] = useTransition();
  const { t } = useLanguage();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'Deities',
      isPublic: false,
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'You must be logged in to create a playlist.' });
      return;
    }

    startTransition(async () => {
      const playlistCollection = collection(db, 'playlists');
      const playlistData = {
          ...data,
          creatorId: user.uid,
          items: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          likesCount: 0,
          viewCount: 0,
      };

      try {
        const docRef = await addDoc(playlistCollection, playlistData);
        toast({
          title: t.playlists.createPlaylistTitle,
          description: 'Your new playlist has been successfully created.',
        });
        router.push(`/playlists/${docRef.id}`);
      } catch (serverError) {
        console.error('Failed to create playlist', serverError);
        const permissionError = new FirestorePermissionError({
            path: playlistCollection.path,
            operation: 'create',
            requestResourceData: playlistData,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Could not create playlist',
          description: serverError instanceof Error ? serverError.message : 'Please try again.',
        });
      }
    });
  };

  if (loadingUser) {
    return (
      <main className="flex-grow container mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-grow container mx-auto px-4 py-16 flex justify-center">
        <Card className="w-full max-w-xl text-center space-y-6 p-8">
          <CardHeader>
            <CardTitle className="text-3xl">{t.playlists.createPlaylistTitle}</CardTitle>
            <CardDescription>
              Please sign in to create and manage your playlists.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" size="lg">
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Sign in to continue
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16 flex justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{t.playlists.createPlaylistTitle}</CardTitle>
          <CardDescription>
            {t.playlists.createPlaylistDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.playlists.playlistTitleLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={t.playlists.playlistTitlePlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.playlists.playlistDescriptionLabel}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t.playlists.playlistDescriptionPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.playlists.categoryLabel}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t.playlists.categoryPlaceholder} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Deities">Deities</SelectItem>
                          <SelectItem value="Stories">Stories</SelectItem>
                          <SelectItem value="Rituals">Rituals</SelectItem>
                          <SelectItem value="Festivals">Festivals</SelectItem>
                          <SelectItem value="Peace">Peace</SelectItem>
                          <SelectItem value="Devotion">Devotion</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormDescription>
                      {t.playlists.categoryDescription}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>{t.playlists.publicLabel}</FormLabel>
                      <FormDescription>
                        {t.playlists.publicDescription}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                {t.playlists.createButton}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}

  