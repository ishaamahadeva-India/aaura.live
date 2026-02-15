
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
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, ArrowLeft } from 'lucide-react';
import { useFirestore, useStorage, useAuth } from '@/lib/firebase/provider';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ImageUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters."),
  description: z.string().min(20, "Description must be at least 20 characters long."),
  imageUrl: z.string().url("Must be a valid image URL.").optional().or(z.literal('')),
  imageHint: z.string().optional(),
  mantra: z.string().min(3, "Mantra is required."),
  goal: z.coerce.number().min(1, "Goal must be at least 1."),
  status: z.enum(['active', 'inactive']),
});


type FormValues = z.infer<typeof formSchema>;

export default function NewContestPage() {
  const { toast } = useToast();
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const [isPending, startTransition] = useTransition();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      imageUrl: '',
      imageHint: 'chanting people',
      mantra: 'Jai Shri Ram',
      goal: 108000,
      status: 'inactive',
    },
  });

  const uploadImage = async (file: File): Promise<string> => {
    if (!storage || !auth?.currentUser) {
      throw new Error('Storage or user not available');
    }

    const storageRef = ref(storage, `contests/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setUploadProgress(100);
          resolve(downloadURL);
        }
      );
    });
  };

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      try {
        let finalImageUrl = data.imageUrl;

        // Upload image if file is selected
        if (imageFile) {
          setIsUploading(true);
          setUploadProgress(0);
          try {
            finalImageUrl = await uploadImage(imageFile);
            toast({ title: 'Image uploaded successfully!' });
          } catch (error: any) {
            console.error('Image upload error:', error);
            toast({ 
              variant: 'destructive', 
              title: 'Upload failed', 
              description: error.message || 'Failed to upload image. Please try again.' 
            });
            setIsUploading(false);
            return;
          } finally {
            setIsUploading(false);
          }
        }

        // Validate that we have an image URL
        if (!finalImageUrl) {
          toast({ 
            variant: 'destructive', 
            title: 'Image required', 
            description: 'Please upload an image or provide an image URL.' 
          });
          return;
        }

        const contestId = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now().toString().slice(-5);
        const contestRef = doc(db, 'contests', contestId);
        
        const contestData = {
          id: contestId,
          ...data,
          imageUrl: finalImageUrl,
          totalChants: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        await setDoc(contestRef, contestData);
        toast({ title: 'Contest Created!', description: `The "${data.title}" contest has been created with status: ${data.status}.` });
        router.push('/admin/content?tab=contests');
      } catch (error: any) {
        console.error("Error creating contest: ", error);
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to create contest.' });
      }
    });
  };

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-2xl mx-auto">
             <Button variant="outline" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Content Management
            </Button>
            <Card className="w-full">
            <CardHeader>
                <CardTitle>Create New Contest</CardTitle>
                <CardDescription>Fill out the form to launch a new global chanting contest.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Contest Title</FormLabel><FormControl><Input placeholder="E.g., Jai Shri Ram Global Chant Marathon" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A short description of the contest's purpose." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField 
                      control={form.control} 
                      name="imageUrl" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contest Image</FormLabel>
                          <FormDescription>Upload an image or provide an image URL</FormDescription>
                          <Tabs defaultValue="upload" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="upload">Upload Image</TabsTrigger>
                              <TabsTrigger value="url">Image URL</TabsTrigger>
                            </TabsList>
                            <TabsContent value="upload" className="space-y-4">
                              <ImageUpload 
                                onFileSelect={(file) => {
                                  setImageFile(file);
                                  if (file) {
                                    // Clear URL field when file is selected
                                    field.onChange('');
                                  }
                                }}
                                initialUrl={field.value || null}
                              />
                              {isUploading && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span>Uploading...</span>
                                    <span>{uploadProgress}%</span>
                                  </div>
                                  <div className="w-full bg-secondary rounded-full h-2">
                                    <div 
                                      className="bg-primary h-2 rounded-full transition-all"
                                      style={{ width: `${uploadProgress}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </TabsContent>
                            <TabsContent value="url" className="space-y-4">
                              <FormControl>
                                <Input 
                                  placeholder="https://example.com/image.jpg" 
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // Clear file when URL is entered
                                    if (e.target.value) {
                                      setImageFile(null);
                                    }
                                  }}
                                />
                              </FormControl>
                              {field.value && (
                                <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                                  <img 
                                    src={field.value} 
                                    alt="Preview" 
                                    className="w-full h-full object-contain"
                                    onError={() => {
                                      toast({
                                        variant: 'destructive',
                                        title: 'Invalid image URL',
                                        description: 'The provided URL does not point to a valid image.'
                                      });
                                    }}
                                  />
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />
                    
                    <FormField control={form.control} name="imageHint" render={({ field }) => (
                        <FormItem><FormLabel>Image Hint</FormLabel><FormControl><Input {...field} /></FormControl><FormDescription>E.g., 'praying hands'</FormDescription><FormMessage /></FormItem>
                    )} />
                    
                    <FormField control={form.control} name="mantra" render={({ field }) => (
                        <FormItem><FormLabel>Chant/Mantra</FormLabel><FormControl><Input placeholder="E.g., Om Namah Shivaya" {...field} /></FormControl><FormDescription>The exact text users need to chant.</FormDescription><FormMessage /></FormItem>
                    )} />


                    <FormField control={form.control} name="goal" render={({ field }) => (
                        <FormItem><FormLabel>Chant Goal</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Set contest status" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    
                    <Button type="submit" disabled={isPending} className="w-full">
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Create Contest
                    </Button>
                </form>
                </Form>
            </CardContent>
            </Card>
        </div>
    </main>
  );
}
