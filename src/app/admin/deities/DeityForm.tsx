
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
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useFirestore, useStorage, useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, setDoc, serverTimestamp, updateDoc, collection, getDoc } from 'firebase/firestore';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { ImageUpload } from '@/components/ImageUpload';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const imageSchema = z.object({
  url: z.string().optional(),
  hint: z.string().min(1, "Hint is required."),
  file: z.any().optional(),
});

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
  images: z.array(imageSchema).min(1, "At least one image is required."),
  mantras: z.array(z.object({
    sanskrit: z.string().min(1, "Sanskrit text is required."),
    translation_en: z.string().min(1, "English translation is required."),
  })).optional(),
   stotras: z.array(z.object({
    title: z.object({ en: z.string().min(1, "English title is required.") }),
    sanskrit: z.string().min(1, "Sanskrit text is required."),
    translation_en: z.string().min(1, "English translation is required."),
  })).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DeityFormProps {
  deity?: any;
}

export function DeityForm({ deity }: DeityFormProps) {
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
    defaultValues: deity || {
      slug: '',
      name: { en: '' },
      description: { en: '' },
      images: [{ url: '', hint: '' }],
      mantras: [{sanskrit: '', translation_en: ''}],
      stotras: [{title: {en: ''}, sanskrit: '', translation_en: ''}],
    },
  });

  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({
    control: form.control,
    name: "images",
  });
  
  const { fields: mantraFields, append: appendMantra, remove: removeMantra } = useFieldArray({
    control: form.control,
    name: "mantras",
  });

  const { fields: stotraFields, append: appendStotra, remove: removeStotra } = useFieldArray({
    control: form.control,
    name: "stotras",
  });

  const title = deity ? `Edit ${deity.name.en}` : 'Add a New Deity';
  const description = deity ? 'Update the details for this deity.' : 'Fill out the form to add a new deity to the database.';

  const onSubmit = (data: FormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to create a deity.' });
      return;
    }

    startTransition(async () => {
      const deityId = deity ? deity.id : data.slug;
      
      if (!deity) {
        // Check if slug already exists for new deities
        const existingDoc = await getDoc(doc(db, 'deities', deityId));
        if (existingDoc.exists()) {
          form.setError('slug', {
            type: 'manual',
            message: 'This slug is already in use. Please choose a unique one.',
          });
          toast({ variant: 'destructive', title: 'Slug already exists' });
          return;
        }
      }

      const deityRef = doc(db, 'deities', deityId);

      // Prepare serializable data without the 'file' object
      const serializableImages = data.images.map(img => ({
        url: img.url || `https://picsum.photos/seed/${deityId}-${Math.random()}/600/400`,
        hint: img.hint
      }));

      // Determine status based on user role
      const status = isSuperAdmin ? 'published' : 'pending';
      
      const saveData = { 
        id: deityId,
        ...data,
        images: serializableImages, // Use the sanitized images array
        status: status, // Ensure status is always set
        updatedAt: serverTimestamp(),
        ...(deity ? {} : { 
          createdAt: serverTimestamp(),
          ...(isSuperAdmin ? {} : { submittedBy: user.uid })
        }),
      };

      // Remove 'file' property before saving
      delete (saveData as any).images.file;

      try {
        // For new documents, use setDoc without merge to ensure all fields are set
        if (!deity) {
          await setDoc(deityRef, saveData);
        } else {
          await setDoc(deityRef, saveData, { merge: true });
        }

        if (isSuperAdmin) {
          toast({ title: `Deity ${deity ? 'Updated' : 'Created'}!`, description: 'The deity is now live.' });
        } else {
          toast({ title: 'Deity Submitted!', description: 'Your submission has been sent for admin approval. You will be notified once it is reviewed.' });
        }
        router.push('/admin/content');
        
        data.images.forEach((image, index) => {
            if (image.file) {
                const file = image.file as File;
                toast({ title: `Uploading image ${index + 1}...`});
                const storageRef = ref(storage, `content-images/deities/${deityId}-${Date.now()}_${file.name}`);
                uploadBytes(storageRef, file).then(snapshot => {
                    getDownloadURL(snapshot.ref).then(finalImageUrl => {
                        updateDoc(deityRef, { [`images.${index}.url`]: finalImageUrl });
                    });
                });
            }
        });

      } catch (serverError: any) {
          console.error('Error saving deity:', serverError);
          const firebaseError = serverError as any;
          
          if (firebaseError?.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: deityRef.path,
                operation: 'create',
                requestResourceData: saveData,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
              variant: 'destructive',
              title: 'Permission Denied',
              description: 'You do not have permission to create deities. Please ensure you are logged in and try again. If the issue persists, contact support.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Failed to save deity',
              description: firebaseError?.message || 'An error occurred while saving. Please try again.',
            });
          }
      }
    });
  };

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
            <FormField control={form.control} name="slug" render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormDescription>A unique identifier for the URL (e.g., 'sri-ganesha').</FormDescription>
                <FormControl><Input {...field} disabled={!!deity} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="name.en" render={({ field }) => (
              <FormItem><FormLabel>Name (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="description.en" render={({ field }) => (
              <FormItem><FormLabel>Description (English)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <Separator />
            
            {/* Images */}
            <div>
              <h3 className="text-lg font-medium mb-2">Images</h3>
              {imageFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start mb-4 border p-4 rounded-md">
                   <div className="space-y-4">
                     <FormField
                        control={form.control}
                        name={`images.${index}.file`}
                        render={() => (
                           <FormItem>
                                <FormLabel>Deity Image {index + 1}</FormLabel>
                                <FormControl>
                                    <ImageUpload
                                        onFileSelect={(file) => form.setValue(`images.${index}.file`, file)}
                                        initialUrl={form.getValues(`images.${index}.url`)}
                                        folderName={`content-images/deities`}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                      />
                    <FormField control={form.control} name={`images.${index}.hint`} render={({ field }) => (
                      <FormItem><FormLabel>Image Hint</FormLabel><FormDescription>A short phrase describing the image for AI (e.g. 'Ganesha meditating').</FormDescription><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                   </div>
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeImage(index)} className="mt-8">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendImage({ url: '', hint: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Image
              </Button>
            </div>

            <Separator />
            
            {/* Mantras */}
            <div>
                <h3 className="text-lg font-medium mb-2">Mantras</h3>
                 {mantraFields.map((field, index) => (
                    <div key={field.id} className="space-y-4 mb-4 border p-4 rounded-md relative">
                         <Button type="button" variant="destructive" size="icon" onClick={() => removeMantra(index)} className="absolute top-2 right-2">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <FormField control={form.control} name={`mantras.${index}.sanskrit`} render={({ field }) => (
                            <FormItem><FormLabel>Sanskrit</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`mantras.${index}.translation_en`} render={({ field }) => (
                            <FormItem><FormLabel>English Translation</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendMantra({ sanskrit: '', translation_en: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Mantra
                </Button>
            </div>
            
            <Separator />

             {/* Stotras */}
            <div>
                <h3 className="text-lg font-medium mb-2">Stotras</h3>
                 {stotraFields.map((field, index) => (
                    <div key={field.id} className="space-y-4 mb-4 border p-4 rounded-md relative">
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeStotra(index)} className="absolute top-2 right-2">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                         <FormField control={form.control} name={`stotras.${index}.title.en`} render={({ field }) => (
                            <FormItem><FormLabel>Title (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`stotras.${index}.sanskrit`} render={({ field }) => (
                            <FormItem><FormLabel>Sanskrit</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`stotras.${index}.translation_en`} render={({ field }) => (
                            <FormItem><FormLabel>English Translation</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendStotra({ title: { en: '' }, sanskrit: '', translation_en: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Stotra
                </Button>
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {deity ? 'Save Changes' : 'Create Deity'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
