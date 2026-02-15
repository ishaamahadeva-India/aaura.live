'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import { useToast } from '@/hooks/use-toast';
import { useTransition, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Trash2, ArrowLeft, Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useStorage, useAuth } from '@/lib/firebase/provider';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { ImageUpload } from '@/components/ImageUpload';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MultiSelect } from '@/components/MultiSelect';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { query, collection as firestoreCollection } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

const formSchema = z.object({
  slug: z.string().min(3, "Slug must be at least 3 characters.").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  name: z.object({
    en: z.string().min(1, "English name is required."),
    hi: z.string().optional(),
    te: z.string().optional(),
  }),
  description: z.object({
    en: z.string().min(1, "English description is required."),
    hi: z.string().optional(),
    te: z.string().optional(),
  }),
  date: z.string().min(1, "Date is required."),
  duration: z.string().min(1, "Duration is required."),
  significance: z.object({
    en: z.string().min(1, "English significance is required."),
    hi: z.string().optional(),
    te: z.string().optional(),
  }),
  rituals: z.object({
    en: z.array(z.string()).min(1, "At least one ritual is required."),
    hi: z.array(z.string()).optional(),
    te: z.array(z.string()).optional(),
  }),
  image: z.object({
    url: z.string().optional(),
    hint: z.string().min(1, "Hint is required."),
    file: z.any().optional(),
  }),
  associatedDeities: z.array(z.string()).optional(),
  relatedProducts: z.array(z.string()).optional(),
  recommendedPlaylist: z.object({
    id: z.string().optional(),
    title: z.string().optional(),
  }).optional(),
  popularity: z.number().default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface FestivalFormProps {
  festival?: any;
}

export function FestivalForm({ festival }: FestivalFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const [user, loadingAuth] = useAuthState(auth);
  const [isClient, setIsClient] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get deities for multi-select
  const deitiesQuery = useMemo(() => {
    if (!db) return undefined;
    return query(firestoreCollection(db, 'deities'));
  }, [db]);
  const [deities] = useCollectionData(deitiesQuery, { idField: 'id' });

  // Get products for multi-select
  const productsQuery = useMemo(() => {
    if (!db) return undefined;
    return query(firestoreCollection(db, 'products'));
  }, [db]);
  const [products] = useCollectionData(productsQuery, { idField: 'id' });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: festival || {
      slug: '',
      name: { en: '', hi: '', te: '' },
      description: { en: '', hi: '', te: '' },
      date: new Date().toISOString().split('T')[0],
      duration: '1 day',
      significance: { en: '', hi: '', te: '' },
      rituals: { en: [''], hi: [], te: [] },
      image: { url: '', hint: '' },
      associatedDeities: [],
      relatedProducts: [],
      recommendedPlaylist: { id: '', title: '' },
      popularity: 0,
    },
  });

  const { fields: ritualFields, append: appendRitual, remove: removeRitual } = useFieldArray({
    control: form.control,
    name: "rituals.en",
  });

  const superAdmin = user?.uid === '9RwsoEEkWPR3Wpv6wKZmhos1xTG2' || user?.email === 'smr@aaura.com';

  if (!isClient || loadingAuth) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16 flex justify-center items-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <div className="text-center py-16">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You must be logged in to access this page.</p>
        </div>
      </main>
    );
  }

  if (!superAdmin) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <div className="text-center py-16">
          <Shield className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-2">You do not have permission to access this page.</p>
          <p className="text-sm text-muted-foreground">Only super administrators can access this page.</p>
        </div>
      </main>
    );
  }

  const onSubmit = async (data: FormValues) => {
    if (!db) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Database not initialized. Please refresh the page.',
      });
      return;
    }

    startTransition(async () => {
      try {
        setIsUploading(true);
        let imageUrl = data.image.url || '';

        // Upload image if file is provided
        if (imageFile && storage) {
          const fileName = `festival-${data.slug}-${Date.now()}-${imageFile.name}`;
          const storageRef = ref(storage, `content-images/festivals/${fileName}`);
          await uploadBytes(storageRef, imageFile);
          imageUrl = await getDownloadURL(storageRef);
        }

        // If no URL or file, use placeholder
        if (!imageUrl) {
          imageUrl = `https://picsum.photos/seed/${data.slug}/600/400`;
        }

        // Convert date string to Timestamp
        const date = new Date(data.date);
        const festivalData = {
          id: festival?.id || data.slug,
          slug: data.slug,
          name: data.name,
          description: data.description,
          date: date, // Store as Date object (Firestore will convert to Timestamp)
          duration: data.duration,
          significance: data.significance,
          rituals: data.rituals,
          image: {
            url: imageUrl,
            hint: data.image.hint,
          },
          associatedDeities: data.associatedDeities || [],
          relatedProducts: data.relatedProducts || [],
          recommendedPlaylist: data.recommendedPlaylist || null,
          popularity: data.popularity || 0,
          status: superAdmin ? 'published' : 'pending',
          createdAt: festival?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...(festival ? {} : {
            ...(superAdmin ? {} : { submittedBy: user?.uid || null })
          }),
        };

        const festivalsCollection = collection(db, 'festivals');
        const festivalRef = doc(festivalsCollection, festival?.id || data.slug);
        await setDoc(festivalRef, festivalData);

        if (superAdmin) {
          toast({
            title: festival ? 'Festival Updated!' : 'Festival Created!',
            description: festival ? 'The festival has been successfully updated.' : 'The new festival has been successfully created.',
          });
        } else {
          toast({
            title: 'Festival Submitted!',
            description: 'Your submission has been sent for admin approval. You will be notified once it is reviewed.',
          });
        }
        router.push('/festivals');
      } catch (error: any) {
        console.error('Error saving festival:', error);
        const permissionError = new FirestorePermissionError({
          path: 'festivals',
          operation: festival ? 'update' : 'create',
          requestResourceData: {},
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: festival ? 'Failed to update festival' : 'Failed to create festival',
          description: error.message || 'Please try again.',
        });
      } finally {
        setIsUploading(false);
      }
    });
  };

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
      <div className="max-w-4xl mx-auto">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Festivals
        </Button>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{festival ? 'Edit Festival' : 'Create New Festival'}</CardTitle>
            <CardDescription>Fill out the details below to {festival ? 'update' : 'create'} a festival.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="diwali" {...field} />
                        </FormControl>
                        <FormDescription>URL-friendly identifier (lowercase, hyphens only)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="name.en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (English)</FormLabel>
                      <FormControl>
                        <Input placeholder="Diwali" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description.en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (English)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="The festival of lights..." rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <FormControl>
                        <Input placeholder="5 days" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="significance.en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Significance (English)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="The spiritual significance of this festival..." rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormLabel>Rituals (English)</FormLabel>
                  {ritualFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <FormField
                        control={form.control}
                        name={`rituals.en.${index}`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder={`Ritual ${index + 1}`} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRitual(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendRitual('')}
                    className="w-full"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Ritual
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Festival Image</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <ImageUpload
                            onFileSelect={(file) => {
                              setImageFile(file);
                              if (file) {
                                field.onChange({ ...field.value, url: '' });
                              }
                            }}
                            initialUrl={field.value?.url || undefined}
                          />
                          <Input
                            placeholder="Or paste an image URL here"
                            value={field.value?.url || ''}
                            onChange={(e) => {
                              field.onChange({ ...field.value, url: e.target.value });
                              if (e.target.value) {
                                setImageFile(null);
                              }
                            }}
                          />
                          <Input
                            placeholder="Image hint/description"
                            value={field.value?.hint || ''}
                            onChange={(e) => {
                              field.onChange({ ...field.value, hint: e.target.value });
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {deities && deities.length > 0 && (
                  <FormField
                    control={form.control}
                    name="associatedDeities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Associated Deities</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={deities.map((d: any) => ({ value: d.slug, label: d.name?.en || d.slug }))}
                            selected={field.value || []}
                            onChange={field.onChange}
                            placeholder="Select deities..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {products && products.length > 0 && (
                  <FormField
                    control={form.control}
                    name="relatedProducts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Related Products</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={products.map((p: any) => ({ value: p.id, label: p.name_en || p.id }))}
                            selected={field.value || []}
                            onChange={field.onChange}
                            placeholder="Select products..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="popularity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Popularity Score</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isPending || isUploading} className="w-full">
                  {isPending || isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                  )}
                  {isUploading ? 'Uploading Image...' : isPending ? (festival ? 'Updating Festival...' : 'Creating Festival...') : (festival ? 'Update Festival' : 'Create Festival')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

