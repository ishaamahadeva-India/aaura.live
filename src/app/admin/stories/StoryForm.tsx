
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useFirestore, useStorage, useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, setDoc, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { ImageUpload } from '@/components/ImageUpload';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ----------------------
// Form Schema Definition
// ----------------------
const formSchema = z.object({
  slug: z.string().min(1, 'Slug is required.'),
  title: z.object({ en: z.string().min(1, 'English title is required.') }),
  summary: z.object({ en: z.string().min(1, 'English summary is required.') }),
  image: z.object({
    url: z.string().optional(),
    hint: z.string().min(1, 'Hint is required.'),
    file: z.any().optional(),
  }),
  tags: z.string().min(1, 'At least one tag is required.'),
  relatedCharacters: z.string().optional(),
  relatedTemples: z.string().optional(),
  episodes: z
    .array(
      z.object({
        episodeNumber: z.coerce.number().min(1, 'Episode number is required.'),
        title: z.object({ en: z.string().min(1, 'English title is required.') }),
        description: z.object({
          en: z.string().min(1, 'English description is required.'),
        }),
        videoId: z.string().min(1, 'YouTube Video ID is required.'),
        thumbnailUrl: z.string().url('Must be a valid URL.'),
        duration: z.coerce.number().min(1, 'Duration in seconds is required.'),
      })
    )
    .min(1, 'At least one episode is required.'),
});

type FormValues = z.infer<typeof formSchema>;

interface StoryFormProps {
  story?: any;
}

// ----------------------
// Component Definition
// ----------------------
export function StoryForm({ story }: StoryFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const [isPending, startTransition] = useTransition();
  
  const isSuperAdmin = user?.uid === '9RwsoEEkWPR3Wpv6wKZmhos1xTG2' || user?.email === 'smr@aaura.com';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: story
      ? {
          ...story,
          tags: story.tags?.join(', '),
          relatedCharacters: story.relatedCharacters?.join(', '),
          relatedTemples: story.relatedTemples?.join(', '),
        }
      : {
          slug: '',
          title: { en: '' },
          summary: { en: '' },
          image: { url: '', hint: '' },
          tags: '',
          relatedCharacters: '',
          relatedTemples: '',
          episodes: [
            {
              episodeNumber: 1,
              title: { en: '' },
              description: { en: '' },
              videoId: '',
              thumbnailUrl: '',
              duration: 0,
            },
          ],
        },
  });

  const {
    fields: episodeFields,
    append: appendEpisode,
    remove: removeEpisode,
  } = useFieldArray({
    control: form.control,
    name: 'episodes',
  });

  // ----------------------
  // Submit Handler
  // ----------------------
  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const imageFile = data.image.file;
      const storyId = story ? story.id : data.slug;

      if (!story) {
        const existingDoc = await getDoc(doc(db, 'stories', storyId));
        if (existingDoc.exists()) {
          form.setError('slug', {
            type: 'manual',
            message: 'This slug is already in use. Please choose a unique one.',
          });
          toast({ variant: 'destructive', title: 'Slug already exists' });
          return;
        }
      }

      const storyRef = doc(db, 'stories', storyId);

      const serializableData = {
          ...data,
          image: {
            url: data.image.url || `https://picsum.photos/seed/${storyId}/800/600`,
            hint: data.image.hint,
          }
      };
      
      const fullData = {
        id: storyId,
        ...serializableData,
        tags: data.tags.split(',').map((s) => s.trim()),
        relatedCharacters: data.relatedCharacters
          ? data.relatedCharacters.split(',').map((s) => s.trim())
          : [],
        relatedTemples: data.relatedTemples
          ? data.relatedTemples.split(',').map((s) => s.trim())
          : [],
        status: isSuperAdmin ? 'published' : 'pending',
        updatedAt: serverTimestamp(),
        ...(story ? {} : { 
          createdAt: serverTimestamp(),
          ...(isSuperAdmin ? {} : { submittedBy: user?.uid || null })
        }),
      };
      
      delete (fullData as any).image.file;

      try {
        await setDoc(storyRef, fullData, { merge: true })
        if (isSuperAdmin) {
          toast({
            title: `Saga ${story ? 'Updated' : 'Created'}!`,
            description: 'The saga is now live on the platform.',
          });
        } else {
          toast({
            title: 'Saga Submitted!',
            description: 'Your submission has been sent for admin approval. You will be notified once it is reviewed.',
          });
        }
        router.push('/admin/content?tab=stories');

        if (imageFile) {
            toast({ title: "Uploading Image...", description: "This will happen in the background." });
            const storageRef = ref(storage, `content-images/stories/${Date.now()}_${imageFile.name}`);
            uploadBytes(storageRef, imageFile).then(snapshot => {
                getDownloadURL(snapshot.ref).then(finalImageUrl => {
                    updateDoc(storyRef, { 'image.url': finalImageUrl });
                });
            });
        }

      } catch (error) {
        const permissionError = new FirestorePermissionError({
          path: storyRef.path,
          operation: 'write',
          requestResourceData: fullData,
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    });
  };

  const title = story
    ? `Edit ${story.title?.en || story.name?.en}`
    : 'Add a New Story';
  const description = story
    ? 'Update the details for this story.'
    : 'Fill out the form to add a new story to the database.';

  // ----------------------
  // Render
  // ----------------------
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Info */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormDescription>
                    A unique identifier for the URL (e.g., 'ramayana-summary').
                  </FormDescription>
                  <FormControl>
                    <Input {...field} disabled={!!story} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title.en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (English)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary.en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary (English)</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
                control={form.control}
                name="image.file"
                render={() => (
                    <FormItem>
                        <FormLabel>Saga Cover Image</FormLabel>
                        <FormControl>
                            <ImageUpload
                                onFileSelect={(file) => form.setValue('image.file', file)}
                                initialUrl={form.getValues('image.url')}
                                folderName="content-images/stories"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
             />
             <FormField
                control={form.control}
                name="image.hint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image Hint</FormLabel>
                     <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormDescription>
                    Comma-separated tags (e.g., Epic, Dharma, Rama).
                  </FormDescription>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relatedCharacters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Characters</FormLabel>
                  <FormDescription>
                    Comma-separated character slugs (e.g., rama, sita, hanuman).
                  </FormDescription>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relatedTemples"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Temples</FormLabel>
                  <FormDescription>
                    Comma-separated temple slugs (e.g., ram-mandir-ayodhya).
                  </FormDescription>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Episodes */}
            <div>
              <h3 className="text-lg font-medium mb-2">Episodes</h3>

              {episodeFields.map((field, index) => (
                <div
                  key={field.id}
                  className="space-y-4 mb-4 border p-4 rounded-md relative"
                >
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeEpisode(index)}
                    className="absolute top-2 right-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <FormField
                    control={form.control}
                    name={`episodes.${index}.episodeNumber`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Episode Number</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`episodes.${index}.title.en`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title (English)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`episodes.${index}.description.en`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (English)</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`episodes.${index}.videoId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>YouTube Video ID</FormLabel>
                          <FormDescription>The 11-character ID from the YouTube URL.</FormDescription>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`episodes.${index}.thumbnailUrl`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Thumbnail URL</FormLabel>
                           <FormDescription>Use: https://img.youtube.com/vi/VIDEO_ID/0.jpg</FormDescription>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`episodes.${index}.duration`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (seconds)</FormLabel>
                           <FormDescription>Enter the total seconds.</FormDescription>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendEpisode({
                    episodeNumber: episodeFields.length + 1,
                    title: { en: '' },
                    description: { en: '' },
                    videoId: '',
                    thumbnailUrl: '',
                    duration: 0,
                  })
                }
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Episode
              </Button>
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {story ? 'Save Changes' : 'Create Saga'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
