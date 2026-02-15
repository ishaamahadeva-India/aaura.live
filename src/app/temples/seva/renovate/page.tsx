
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
import { Loader2, ArrowLeft, CalendarIcon } from 'lucide-react';
import { useAuth, useFirestore, useStorage } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';

const formSchema = z.object({
  templeName: z.string().min(5, "Temple name is required."),
  location: z.string().min(5, "Location is required."),
  description: z.string().min(50, "Please provide a detailed description (min 50 characters)."),
  totalGoal: z.coerce.number().min(1000, "Fund goal must be at least ₹1000."),
  progressStatus: z.enum(['planning', 'in-progress', 'completed']),
  proposedStartDate: z.date().optional(),
  proposedCompletionDate: z.date().optional(),
  hasSocietyRegistration: z.boolean().default(false),
  hasApprovals: z.boolean().default(false),
  imageFile: z.any().optional(),
  videoFile: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function RequestRenovationPage() {
  const { toast } = useToast();
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const [user, loadingUser] = useAuthState(auth);
  const [isSubmitting, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      templeName: '',
      location: '',
      description: '',
      totalGoal: 50000,
      progressStatus: 'planning',
      hasSocietyRegistration: false,
      hasApprovals: false,
    },
  });
  
  async function uploadMedia(file: File, folder: string) {
      if (!file || !storage || !user) {
        throw new Error('Missing required parameters for upload');
      }
      
      // Refresh auth token before upload
      try {
        await user.getIdToken(true);
      } catch (tokenError) {
        console.warn('Failed to refresh auth token before upload', tokenError);
      }
      
      const fileName = `${Date.now()}_${file.name}`;
      const fileRef = ref(storage, `${folder}/${fileName}`);
      
      console.log('Uploading file to:', `${folder}/${fileName}`);
      console.log('File size:', file.size, 'bytes');
      console.log('File type:', file.type);
      
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      console.log('File uploaded successfully:', downloadURL);
      return downloadURL;
  }

  const onSubmit = (data: FormValues) => {
    if (loadingUser) {
      toast({ variant: 'default', title: 'Loading...', description: 'Please wait while we verify your authentication.' });
      return;
    }

    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Required', description: 'You must be logged in to submit a request. Please log in and try again.' });
      return;
    }

    if (!db) {
      toast({ variant: 'destructive', title: 'Database Error', description: 'Database is not available. Please refresh the page and try again.' });
      return;
    }

    startTransition(async () => {

      try {
        // Refresh auth token before submission
        try {
          await user.getIdToken(true);
        } catch (tokenError) {
          console.warn('Failed to refresh auth token', tokenError);
        }

        toast({ title: "Submitting request...", description: "Please wait while we process your submission." });
        
        // Handle file inputs - they might be FileList or null
        let imageFile: File | null = null;
        let videoFile: File | null = null;
        
        if (data.imageFile) {
          if (data.imageFile instanceof FileList) {
            imageFile = data.imageFile.length > 0 ? data.imageFile[0] : null;
          } else if (data.imageFile instanceof File) {
            imageFile = data.imageFile;
          }
        }
        
        if (data.videoFile) {
          if (data.videoFile instanceof FileList) {
            videoFile = data.videoFile.length > 0 ? data.videoFile[0] : null;
          } else if (data.videoFile instanceof File) {
            videoFile = data.videoFile;
          }
        }

        let imageUrl = null;
        let videoUrl = null;

        // Check storage availability
        if (!storage) {
          toast({ variant: 'destructive', title: 'Storage Error', description: 'Storage service is not available. Please refresh the page and try again.' });
          return;
        }

        // Upload image if provided
        if (imageFile) {
          try {
            console.log('Starting image upload...');
            imageUrl = await uploadMedia(imageFile, "renovation_requests");
            console.log('Image upload successful:', imageUrl);
          } catch (uploadError: any) {
            console.error('Image upload failed:', uploadError);
            const errorCode = uploadError?.code || 'unknown';
            const errorMessage = uploadError?.message || 'Unknown error';
            
            if (errorCode === 'storage/unauthorized' || errorCode === 'storage/permission-denied') {
              toast({ 
                variant: 'destructive', 
                title: 'Image Upload Permission Denied', 
                description: 'You do not have permission to upload images. Please ensure you are logged in correctly and try again.' 
              });
            } else {
              toast({ 
                variant: 'destructive', 
                title: 'Image Upload Failed', 
                description: `Could not upload image: ${errorMessage}. You can continue without the image or try again.` 
              });
            }
            // Don't return - allow submission without image
            imageUrl = null;
          }
        }
        
        // Upload video if provided
        if (videoFile) {
          try {
            console.log('Starting video upload...');
            videoUrl = await uploadMedia(videoFile, "renovation_requests");
            console.log('Video upload successful:', videoUrl);
          } catch (uploadError: any) {
            console.error('Video upload failed:', uploadError);
            const errorCode = uploadError?.code || 'unknown';
            const errorMessage = uploadError?.message || 'Unknown error';
            
            if (errorCode === 'storage/unauthorized' || errorCode === 'storage/permission-denied') {
              toast({ 
                variant: 'destructive', 
                title: 'Video Upload Permission Denied', 
                description: 'You do not have permission to upload videos. Please ensure you are logged in correctly and try again.' 
              });
            } else {
              toast({ 
                variant: 'destructive', 
                title: 'Video Upload Failed', 
                description: `Could not upload video: ${errorMessage}. You can continue without the video or try again.` 
              });
            }
            // Don't return - allow submission without video
            videoUrl = null;
          }
        }
        
        // Clean up the data - ensure all values are valid for Firestore
        const cleanData: any = {
          templeName: String(data.templeName || '').trim(),
          location: String(data.location || '').trim(),
          description: String(data.description || '').trim(),
          totalGoal: Number(data.totalGoal) || 0,
          progressStatus: String(data.progressStatus || 'planning'),
          hasSocietyRegistration: Boolean(data.hasSocietyRegistration),
          hasApprovals: Boolean(data.hasApprovals),
          createdBy: String(user.uid),
          creatorId: String(user.uid),
          createdAt: serverTimestamp(),
          status: 'pending',
        };

        // Add image/video URLs only if they exist
        if (imageUrl) {
          cleanData.imageUrl = String(imageUrl);
        }
        if (videoUrl) {
          cleanData.videoUrl = String(videoUrl);
        }

        // Add dates only if they exist and are valid Date objects
        if (data.proposedStartDate && data.proposedStartDate instanceof Date && !isNaN(data.proposedStartDate.getTime())) {
          cleanData.proposedStartDate = format(data.proposedStartDate, "yyyy-MM-dd");
        }
        if (data.proposedCompletionDate && data.proposedCompletionDate instanceof Date && !isNaN(data.proposedCompletionDate.getTime())) {
          cleanData.proposedCompletionDate = format(data.proposedCompletionDate, "yyyy-MM-dd");
        }

        // Validate required fields
        if (!cleanData.templeName || cleanData.templeName.length < 5) {
          toast({ variant: 'destructive', title: 'Validation Error', description: 'Temple name must be at least 5 characters.' });
          return;
        }
        if (!cleanData.location || cleanData.location.length < 5) {
          toast({ variant: 'destructive', title: 'Validation Error', description: 'Location must be at least 5 characters.' });
          return;
        }
        if (!cleanData.description || cleanData.description.length < 50) {
          toast({ variant: 'destructive', title: 'Validation Error', description: 'Description must be at least 50 characters.' });
          return;
        }
        if (!cleanData.totalGoal || cleanData.totalGoal < 1000) {
          toast({ variant: 'destructive', title: 'Validation Error', description: 'Total goal must be at least ₹1000.' });
          return;
        }

        console.log('Submitting request data:', JSON.stringify(cleanData, null, 2));

        const requestsCollection = collection(db, 'temple_renovation_requests');
        const docRef = await addDoc(requestsCollection, cleanData);
        
        console.log('Successfully created document with ID:', docRef.id);

        toast({ title: 'Request Submitted!', description: 'Your request for temple renovation funding has been submitted for review.' });
        router.push('/temples/seva');

      } catch (error: any) {
        console.error("=== ERROR SUBMITTING REQUEST ===");
        console.error("Full error object:", error);
        console.error("Error code:", error?.code);
        console.error("Error message:", error?.message);
        console.error("Error stack:", error?.stack);
        console.error("Error name:", error?.name);
        console.error("User UID:", user?.uid);
        console.error("Database available:", !!db);
        console.error("Storage available:", !!storage);
        
        const firebaseError = error as any;
        let errorMessage = 'There was an error submitting your request.';
        
        if (firebaseError?.code === 'permission-denied') {
          errorMessage = 'Permission denied. Please ensure you are logged in correctly and try again.';
          const permissionError = new FirestorePermissionError({
            path: `temple_renovation_requests`,
            operation: 'create',
            requestResourceData: {},
          });
          errorEmitter.emit('permission-error', permissionError);
        } else if (firebaseError?.code === 'invalid-argument') {
          errorMessage = 'Some of the data you entered is invalid. Please check all fields and try again.';
        } else if (firebaseError?.code === 'unavailable') {
          errorMessage = 'The service is temporarily unavailable. Please try again in a moment.';
        } else if (firebaseError?.code === 'failed-precondition') {
          errorMessage = 'A required condition was not met. Please refresh the page and try again.';
        } else if (firebaseError?.code === 'aborted') {
          errorMessage = 'The operation was aborted. Please try again.';
        } else if (firebaseError?.message) {
          errorMessage = firebaseError.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        toast({ 
          variant: 'destructive', 
          title: 'Submission Failed', 
          description: `${errorMessage} (Error code: ${firebaseError?.code || 'unknown'})` 
        });
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
            <CardTitle>Request Temple Renovation Funding</CardTitle>
            <CardDescription>Provide details about the temple and the proposed renovation to seek community support.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                <FormField control={form.control} name="templeName" render={({ field }) => (
                  <FormItem><FormLabel>Temple Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel>Location (City, State)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description of Renovation</FormLabel><FormControl><Textarea {...field} rows={5} /></FormControl><FormDescription>Describe the current state and the work that needs to be done.</FormDescription><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="totalGoal" render={({ field }) => (
                  <FormItem><FormLabel>Total Funding Goal (INR)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription>The total amount required for the renovation project.</FormDescription><FormMessage /></FormItem>
                )} />
                
                 <FormField control={form.control} name="progressStatus" render={({ field }) => (
                    <FormItem><FormLabel>Current Project Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="planning">Planning</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="proposedStartDate" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Proposed Start Date</FormLabel>
                            <Popover><PopoverTrigger asChild>
                                <FormControl>
                                <Button variant={"outline"} className={cn(!field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent></Popover>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="proposedCompletionDate" render={({ field }) => (
                         <FormItem className="flex flex-col"><FormLabel>Proposed Completion Date</FormLabel>
                            <Popover><PopoverTrigger asChild>
                                <FormControl>
                                <Button variant={"outline"} className={cn(!field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent></Popover>
                        <FormMessage /></FormItem>
                    )} />
                </div>

                 <div className="space-y-4">
                    <FormField control={form.control} name="hasSocietyRegistration" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>Is there a registered society/trust for the temple?</FormLabel>
                        </div>
                        </FormItem>
                    )} />
                     <FormField control={form.control} name="hasApprovals" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>Are all necessary government approvals in place?</FormLabel>
                        </div>
                        </FormItem>
                    )} />
                 </div>

                <FormField 
                  control={form.control} 
                  name="imageFile" 
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormItem>
                      <FormLabel>Temple Image (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="file" 
                          accept="image/*" 
                          {...field}
                          onChange={(e) => {
                            const files = e.target.files;
                            onChange(files && files.length > 0 ? files : null);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />

                <FormField 
                  control={form.control} 
                  name="videoFile" 
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormItem>
                      <FormLabel>Video (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="file" 
                          accept="video/*" 
                          {...field}
                          onChange={(e) => {
                            const files = e.target.files;
                            onChange(files && files.length > 0 ? files : null);
                          }}
                        />
                      </FormControl>
                      <FormDescription>A short video showing the temple's condition.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} 
                />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Request
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
