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
import { useTransition, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, PlusCircle, UploadCloud, Image as ImageIcon, Video, FileText, X, CheckCircle2 } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useAuth, useFirestore, useStorage } from '@/lib/firebase/provider';
import { addDoc, collection, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { ImageUpload } from '@/components/ImageUpload';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long.").max(200, "Title must be less than 200 characters."),
  technique: z.string().min(20, "Please describe the technique in at least 20 characters.").max(5000, "Technique description must be less than 5000 characters."),
  results: z.string().max(2000, "Results description must be less than 2000 characters.").optional(),
  tags: z.string().min(3, "Please add at least one tag.").max(200, "Tags must be less than 200 characters."),
  imageUrl: z.string().url("Please provide a valid image URL.").optional().or(z.literal('')),
  videoUrl: z.string().url("Please provide a valid video URL.").optional().or(z.literal('')),
  beforeImageUrl: z.string().url("Please provide a valid image URL.").optional().or(z.literal('')),
  afterImageUrl: z.string().url("Please provide a valid image URL.").optional().or(z.literal('')),
  duration: z.string().max(100, "Duration must be less than 100 characters.").optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateManifestationPage() {
  const { toast } = useToast();
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const [user] = useAuthState(useAuth());
  const [isPending, startTransition] = useTransition();
  
  // File upload states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [beforeImageFile, setBeforeImageFile] = useState<File | null>(null);
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const uploadTasksRef = useRef<Record<string, UploadTask>>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      technique: '',
      results: '',
      tags: '',
      imageUrl: '',
      videoUrl: '',
      beforeImageUrl: '',
      afterImageUrl: '',
      duration: '',
      difficulty: 'beginner',
    },
  });

  // Validate file size (10MB for images, 5GB for videos to support long videos)
  const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024; // 5GB for videos (supports 30-60 min videos)
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };
  
  const validateFileSize = (file: File, type: 'image' | 'video'): boolean => {
    const maxSize = type === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: `${type === 'image' ? 'Images' : 'Videos'} must be less than ${formatFileSize(maxSize)}. Your file is ${formatFileSize(file.size)}.`,
      });
      return false;
    }
    return true;
  };

  // Upload file to Firebase Storage with progress tracking
  const uploadFile = async (file: File, path: string, key: string): Promise<string> => {
    if (!storage || !user) {
      throw new Error('Storage or user not available');
    }
    
    const storageRef = ref(storage, `manifestations/${user.uid}/${path}/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTasksRef.current[key] = uploadTask;
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(prev => ({ ...prev, [key]: progress }));
        },
        (error) => {
          delete uploadTasksRef.current[key];
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setUploadProgress(prev => ({ ...prev, [key]: 100 }));
          delete uploadTasksRef.current[key];
          resolve(downloadURL);
        }
      );
    });
  };

  // Handle file uploads
  const handleFileUploads = async (): Promise<{ imageUrl?: string; videoUrl?: string; beforeImageUrl?: string; afterImageUrl?: string }> => {
    const urls: { imageUrl?: string; videoUrl?: string; beforeImageUrl?: string; afterImageUrl?: string } = {};
    
    setIsUploading(true);
    setUploadProgress({});
    
    try {
      if (imageFile) {
        if (!validateFileSize(imageFile, 'image')) {
          throw new Error('Image file too large');
        }
        setUploadProgress(prev => ({ ...prev, image: 0 }));
        urls.imageUrl = await uploadFile(imageFile, 'images', 'image');
      }
      
      if (videoFile) {
        if (!validateFileSize(videoFile, 'video')) {
          throw new Error('Video file too large');
        }
        setUploadProgress(prev => ({ ...prev, video: 0 }));
        urls.videoUrl = await uploadFile(videoFile, 'videos', 'video');
      }
      
      if (beforeImageFile) {
        if (!validateFileSize(beforeImageFile, 'image')) {
          throw new Error('Before image file too large');
        }
        setUploadProgress(prev => ({ ...prev, before: 0 }));
        urls.beforeImageUrl = await uploadFile(beforeImageFile, 'results/before', 'before');
      }
      
      if (afterImageFile) {
        if (!validateFileSize(afterImageFile, 'image')) {
          throw new Error('After image file too large');
        }
        setUploadProgress(prev => ({ ...prev, after: 0 }));
        urls.afterImageUrl = await uploadFile(afterImageFile, 'results/after', 'after');
      }
    } catch (error: any) {
      setIsUploading(false);
      throw error;
    }
    
    setIsUploading(false);
    return urls;
  };

  const cancelUploads = () => {
    Object.values(uploadTasksRef.current).forEach(task => {
      try {
        task.cancel();
      } catch {
        // ignore
      }
    });
    uploadTasksRef.current = {};
    setIsUploading(false);
    setUploadProgress({});
  };

  const resetFiles = () => {
    setImageFile(null);
    setVideoFile(null);
    setBeforeImageFile(null);
    setAfterImageFile(null);
  };

  const onSubmit = async (data: FormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'You must be logged in to post.' });
        return;
    }

    if (!db) {
        toast({ variant: 'destructive', title: 'Database connection error.' });
        return;
    }

    startTransition(async () => {
      try {
        setIsUploading(true);
        
        // Upload files first
        const uploadedUrls = await handleFileUploads();
        
        const manifestationsCollection = collection(db, 'manifestations');
        const postData = {
            userId: user.uid,
            creatorId: user.uid,
            title: data.title,
            technique: data.technique,
            results: data.results || null,
            tags: data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
            imageUrl: uploadedUrls.imageUrl || data.imageUrl || null,
            videoUrl: uploadedUrls.videoUrl || data.videoUrl || null,
            beforeImageUrl: uploadedUrls.beforeImageUrl || data.beforeImageUrl || null,
            afterImageUrl: uploadedUrls.afterImageUrl || data.afterImageUrl || null,
            duration: data.duration || null,
            difficulty: data.difficulty || 'beginner',
            createdAt: serverTimestamp(),
            likesCount: 0,
            commentsCount: 0,
            views: 0,
        };
        
        const docRef = await addDoc(manifestationsCollection, postData);
        await updateDoc(docRef, { id: docRef.id });

        toast({ 
          title: 'Manifestation Shared!', 
          description: 'Your story has been added to the hub.' 
        });
        resetFiles();
        router.push(`/manifestation/${docRef.id}`);
      } catch (error: any) {
        if (error?.code === 'storage/canceled') {
          toast({
            title: 'Upload cancelled',
            description: 'Your media upload was cancelled.',
          });
        } else {
          console.error('Error creating manifestation:', error);
          const permissionError = new FirestorePermissionError({
              path: 'manifestations',
              operation: 'create',
              requestResourceData: {},
          });
          errorEmitter.emit('permission-error', permissionError);
          toast({
            variant: 'destructive',
            title: 'Failed to create manifestation',
            description: error.message || 'Please try again.',
          });
        }
      } finally {
        uploadTasksRef.current = {};
        setIsUploading(false);
      }
    });
  };

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
             <Button variant="outline" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Manifestation Hub
            </Button>
            
            <Card className="w-full border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-lg">
                <CardTitle className="text-3xl font-bold flex items-center gap-2">
                    <PlusCircle className="h-6 w-6 text-primary" />
                    Share Your Manifestation Journey
                </CardTitle>
                <CardDescription className="text-base mt-2">
                    Inspire others by sharing your techniques, methods, and results. Upload images, videos, and before/after results to make your story more compelling.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                    {/* Title */}
                    <FormField 
                        control={form.control} 
                        name="title" 
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base font-semibold">Title *</FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder="E.g., How I manifested my dream vacation in 30 days" 
                                        {...field} 
                                        className="text-base"
                                    />
                                </FormControl>
                                <FormDescription>Create an engaging title that captures your manifestation story</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} 
                    />

                    {/* Technique/Method */}
                    <FormField 
                        control={form.control} 
                        name="technique" 
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base font-semibold">Technique/Method *</FormLabel>
                                <FormControl>
                                    <Textarea 
                                        placeholder="Describe the step-by-step method you used. For example:&#10;&#10;1. The 369 method: Write your desire 3 times in the morning, 6 times in the afternoon, and 9 times at night&#10;2. Visualization: Spend 10 minutes daily visualizing your desired outcome&#10;3. Affirmations: Repeat positive affirmations aligned with your goal&#10;4. Gratitude: Write 5 things you're grateful for each day" 
                                        {...field} 
                                        rows={8} 
                                        className="text-base resize-none"
                                        maxLength={5000}
                                    />
                                </FormControl>
                                <div className="flex justify-between items-center">
                                    <FormDescription>Be detailed and specific. Others will follow your steps!</FormDescription>
                                    <span className="text-xs text-muted-foreground">
                                        {field.value?.length || 0}/5000 characters
                                    </span>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} 
                    />

                    {/* Results */}
                    <FormField 
                        control={form.control} 
                        name="results" 
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base font-semibold">Results (Optional)</FormLabel>
                                <FormControl>
                                    <Textarea 
                                        placeholder="Share the outcome of your practice. What happened? How did it manifest? What did you learn?" 
                                        {...field} 
                                        rows={5} 
                                        className="text-base resize-none"
                                    />
                                </FormControl>
                                <FormDescription>Your success story will inspire others to start their journey</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} 
                    />

                    {/* Media Upload Tabs */}
                    <Tabs defaultValue="main" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="main">Main Media</TabsTrigger>
                            <TabsTrigger value="results">Results</TabsTrigger>
                            <TabsTrigger value="video">Video</TabsTrigger>
                            <TabsTrigger value="details">Details</TabsTrigger>
                        </TabsList>
                        
                        {/* Main Image */}
                        <TabsContent value="main" className="space-y-4 mt-4">
                            <Card className="border-dashed border-2">
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4" />
                                        Main Image
                                    </CardTitle>
                                    <CardDescription>Upload a main image for your manifestation story</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ImageUpload
                                        onFileSelect={(file) => {
                                            setImageFile(file);
                                            if (file) {
                                                form.setValue('imageUrl', '');
                                            }
                                        }}
                                        initialUrl={form.watch('imageUrl') || undefined}
                                    />
                                    {imageFile && (
                                        <Badge variant="secondary" className="mt-2 flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" />
                                            <span className="text-xs">
                                                {imageFile.name} ({(imageFile.size / (1024 * 1024)).toFixed(2)} MB)
                                            </span>
                                        </Badge>
                                    )}
                                    <FormField 
                                        control={form.control} 
                                        name="imageUrl" 
                                        render={({ field }) => (
                                            <FormItem className="mt-4">
                                                <FormLabel className="text-sm">Or enter image URL</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="https://example.com/image.jpg" 
                                                        {...field} 
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Before/After Results */}
                        <TabsContent value="results" className="space-y-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="border-dashed border-2">
                                    <CardHeader>
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            Before Image
                                        </CardTitle>
                                        <CardDescription>Show your starting point</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ImageUpload
                                            onFileSelect={(file) => {
                                                setBeforeImageFile(file);
                                                if (file) {
                                                    form.setValue('beforeImageUrl', '');
                                                }
                                            }}
                                            initialUrl={form.watch('beforeImageUrl') || undefined}
                                        />
                                        {beforeImageFile && (
                                            <Badge variant="secondary" className="mt-2 flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                <span className="text-xs">
                                                    {beforeImageFile.name} ({(beforeImageFile.size / (1024 * 1024)).toFixed(2)} MB)
                                                </span>
                                            </Badge>
                                        )}
                                        <FormField 
                                            control={form.control} 
                                            name="beforeImageUrl" 
                                            render={({ field }) => (
                                                <FormItem className="mt-4">
                                                    <FormLabel className="text-xs">Or enter URL</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            placeholder="Before image URL" 
                                                            {...field} 
                                                            className="text-sm"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} 
                                        />
                                    </CardContent>
                                </Card>

                                <Card className="border-dashed border-2">
                                    <CardHeader>
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            After Image
                                        </CardTitle>
                                        <CardDescription>Show your results</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ImageUpload
                                            onFileSelect={(file) => {
                                                setAfterImageFile(file);
                                                if (file) {
                                                    form.setValue('afterImageUrl', '');
                                                }
                                            }}
                                            initialUrl={form.watch('afterImageUrl') || undefined}
                                        />
                                        {afterImageFile && (
                                            <Badge variant="secondary" className="mt-2 flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                <span className="text-xs">
                                                    {afterImageFile.name} ({(afterImageFile.size / (1024 * 1024)).toFixed(2)} MB)
                                                </span>
                                            </Badge>
                                        )}
                                        <FormField 
                                            control={form.control} 
                                            name="afterImageUrl" 
                                            render={({ field }) => (
                                                <FormItem className="mt-4">
                                                    <FormLabel className="text-xs">Or enter URL</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            placeholder="After image URL" 
                                                            {...field} 
                                                            className="text-sm"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} 
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* Video */}
                        <TabsContent value="video" className="space-y-4 mt-4">
                            <Card className="border-dashed border-2">
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Video className="h-4 w-4" />
                                        Video Upload
                                    </CardTitle>
                                    <CardDescription>Upload a video explaining your manifestation journey</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="w-full p-4 border-2 border-dashed rounded-lg text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">
                                                Drag and drop or click to browse video
                                            </p>
                                            <Input
                                                id="video-upload"
                                                type="file"
                                                accept="video/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        if (!validateFileSize(file, 'video')) {
                                                            e.target.value = '';
                                                            return;
                                                        }
                                                        setVideoFile(file);
                                                        form.setValue('videoUrl', '');
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                            <Button asChild variant="outline" type="button">
                                                <label htmlFor="video-upload" className="cursor-pointer">
                                                    Browse Video Files
                                                </label>
                                            </Button>
                                        </div>
                                    </div>
                                    {videoFile && (
                                        <div className="mt-4 p-3 bg-secondary/50 rounded-lg space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Video className="h-4 w-4 text-primary" />
                                                    <div>
                                                        <span className="text-sm font-medium block">{videoFile.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setVideoFile(null)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    <FormField 
                                        control={form.control} 
                                        name="videoUrl" 
                                        render={({ field }) => (
                                            <FormItem className="mt-4">
                                                <FormLabel className="text-sm">Or enter video URL</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="https://example.com/video.mp4 or YouTube/Vimeo URL" 
                                                        {...field} 
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Additional Details */}
                        <TabsContent value="details" className="space-y-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField 
                                    control={form.control} 
                                    name="duration" 
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Duration (Optional)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="E.g., 30 days, 3 months, 1 year" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormDescription>How long did it take to manifest?</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} 
                                />
                                <FormField 
                                    control={form.control} 
                                    name="difficulty" 
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Difficulty Level</FormLabel>
                                            <FormControl>
                                                <select 
                                                    {...field} 
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <option value="beginner">Beginner</option>
                                                    <option value="intermediate">Intermediate</option>
                                                    <option value="advanced">Advanced</option>
                                                </select>
                                            </FormControl>
                                            <FormDescription>How easy is this technique to follow?</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} 
                                />
                            </div>
                        </TabsContent>
                    </Tabs>
                    
                    {/* Tags */}
                    <FormField 
                        control={form.control} 
                        name="tags" 
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base font-semibold">Tags *</FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder="abundance, scripting, gratitude, law-of-attraction" 
                                        {...field} 
                                        className="text-base"
                                    />
                                </FormControl>
                                <FormDescription>Comma-separated keywords to help others find your post (e.g., abundance, scripting, 369-method)</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} 
                    />
                    
                    {/* Upload Progress */}
                    {isUploading && Object.keys(uploadProgress).length > 0 && (
                        <Alert className="border-primary/20 bg-primary/5">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <AlertTitle>Uploading Files</AlertTitle>
                            <AlertDescription className="space-y-2 mt-2">
                                {imageFile && (
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Main Image: {imageFile.name}</span>
                                            <span>{uploadProgress.image || 0}%</span>
                                        </div>
                                        <Progress value={uploadProgress.image || 0} className="h-2" />
                                    </div>
                                )}
                                {videoFile && (
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Video: {videoFile.name}</span>
                                            <span>{uploadProgress.video || 0}%</span>
                                        </div>
                                        <Progress value={uploadProgress.video || 0} className="h-2" />
                                    </div>
                                )}
                                {beforeImageFile && (
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Before Image: {beforeImageFile.name}</span>
                                            <span>{uploadProgress.before || 0}%</span>
                                        </div>
                                        <Progress value={uploadProgress.before || 0} className="h-2" />
                                    </div>
                                )}
                                {afterImageFile && (
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>After Image: {afterImageFile.name}</span>
                                            <span>{uploadProgress.after || 0}%</span>
                                        </div>
                                        <Progress value={uploadProgress.after || 0} className="h-2" />
                                    </div>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Submit Button */}
                    <div className="flex gap-4 pt-4">
                        <Button 
                            type="submit" 
                            disabled={isPending || isUploading} 
                            className="flex-1 text-base h-12"
                            size="lg"
                        >
                            {isPending || isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    {isUploading ? 'Uploading Files...' : 'Sharing Your Story...'}
                                </>
                            ) : (
                                <>
                                    <PlusCircle className="mr-2 h-5 w-5" />
                                    Share My Manifestation Story
                                </>
                            )}
                        </Button>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                                cancelUploads();
                                resetFiles();
                                form.reset();
                                router.back();
                            }}
                            disabled={isPending && !isUploading}
                            className="h-12"
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
