
'use client';

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
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { EpicHero } from '@/lib/characters';
import { useFirestore, useStorage, useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { ImageUpload } from '@/components/ImageUpload';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const formSchema = z.object({
  slug: z.string().min(1, "Slug is required."),
  name: z.object({ en: z.string().min(1, "English name is required.") }),
  description: z.string().min(1, "English description is required."),
  imageUrl: z.string().optional(),
  imageFile: z.any().optional(),
  imageHint: z.string().optional(),
  epicAssociation: z.string().min(1, "Epic association is required (e.g., Mahabharata)."),
});

type FormValues = z.infer<typeof formSchema>;

interface CharacterFormProps {
  character?: EpicHero;
}

export function CharacterForm({ character }: CharacterFormProps) {
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
    defaultValues: character ? {
      slug: character.slug,
      name: { en: character.name.en || '' },
      description: character.description,
      imageUrl: character.imageUrl,
      imageHint: character.imageHint,
      epicAssociation: character.epicAssociation.join(', '),
    } : {
      slug: '',
      name: { en: '' },
      description: '',
      imageUrl: '',
      imageHint: '',
      epicAssociation: '',
    },
  });

  const title = character ? `Edit ${character.name.en}` : 'Add a New Epic Hero';
  const description = character ? 'Update the details for this hero.' : 'Fill out the form to add a new hero to the database.';

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const imageFile = data.imageFile;
      const characterId = character ? character.id : data.slug;
      
      const saveData = {
          id: characterId,
          slug: data.slug,
          name: data.name,
          description: data.description,
          epicAssociation: data.epicAssociation.split(',').map(s => s.trim()),
          status: isSuperAdmin ? 'published' : 'pending',
          background: character?.background || { birth: '', earlyLife: '', family: { parents: [], siblings: [], spouses: [], children: [] } },
          prominence: character?.prominence || '',
          qualities: character?.qualities || [],
          achievements: character?.achievements || [],
          mistakes: character?.mistakes || [],
          learningsForChildren: character?.learningsForChildren || [],
          relatedContent: character?.relatedContent || { sacredTales: [], deities: [], rituals: [] },
          popularity: character?.popularity || 0,
          quote: character?.quote || {text: '', source: ''},
          modernRelevance: character?.modernRelevance || '',
          imageUrl: character?.imageUrl || `https://picsum.photos/seed/${characterId}/600/400`,
          imageHint: data.imageHint,
          updatedAt: serverTimestamp(),
          ...(character ? {} : { 
            createdAt: serverTimestamp(),
            ...(isSuperAdmin ? {} : { submittedBy: user?.uid || null })
          }),
      };

      try {
        const characterRef = doc(db, 'epicHeroes', characterId);
        await setDoc(characterRef, saveData, { merge: true });

        if (isSuperAdmin) {
          toast({ title: `Character ${character ? 'Updated' : 'Created'}!`, description: 'The character is now live.' });
        } else {
          toast({ title: 'Character Submitted!', description: 'Your submission has been sent for admin approval. You will be notified once it is reviewed.' });
        }
        router.push('/admin/content');

        if (imageFile) {
            toast({ title: "Uploading Image...", description: "This will happen in the background." });
            const storageRef = ref(storage, `content-images/heroes/${Date.now()}_${imageFile.name}`);
            uploadBytes(storageRef, imageFile).then(snapshot => {
                getDownloadURL(snapshot.ref).then(finalImageUrl => {
                    updateDoc(characterRef, { imageUrl: finalImageUrl });
                });
            });
        }
      } catch (serverError) {
        const permissionError = new FirestorePermissionError({
            path: `epicHeroes/${characterId}`,
            operation: 'write',
            requestResourceData: saveData,
        });
        errorEmitter.emit('permission-error', permissionError);
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
            <FormField control={form.control} name="slug" render={({ field }) => (
              <FormItem><FormLabel>Slug</FormLabel><FormDescription>A unique identifier for the URL (e.g., 'hanuman').</FormDescription><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="name.en" render={({ field }) => (
              <FormItem><FormLabel>Name (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Short Description (English)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />

             <FormField control={form.control} name="imageFile" render={({ field }) => (
                <FormItem>
                    <FormLabel>Hero Image</FormLabel>
                    <FormControl>
                        <ImageUpload 
                            onFileSelect={(file) => form.setValue('imageFile', file)}
                            initialUrl={form.getValues('imageUrl')}
                            folderName="content-images/heroes"
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
             )} />

            <FormField control={form.control} name="imageHint" render={({ field }) => (
                <FormItem>
                    <FormLabel>Image Hint</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormDescription>e.g. `warrior archer` for AI image search.</FormDescription>
                    <FormMessage />
                </FormItem>
            )} />

            <FormField control={form.control} name="epicAssociation" render={({ field }) => (
              <FormItem><FormLabel>Epic Association</FormLabel><FormDescription>Comma-separated epics (e.g., Ramayana, Mahabharata).</FormDescription><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {character ? 'Submit Changes for Review' : 'Submit for Review'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
