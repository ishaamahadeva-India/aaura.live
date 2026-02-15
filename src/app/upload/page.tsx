
'use client';

import { useRef, useState, useTransition } from 'react';
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
import { useAuth, useFirestore, useStorage } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable, UploadTask } from "firebase/storage";
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { moderateContent } from '@/ai/ai-content-moderation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/hooks/use-language';
import { Progress } from '@/components/ui/progress';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirebaseError } from 'firebase/app';


const formSchema = z.object({
  title_en: z.string().min(5, { message: 'English title must be at least 5 characters.' }),
  title_hi: z.string().optional(),
  title_te: z.string().optional(),
  description_en: z.string().min(10, { message: 'English description must be at least 10 characters.' }),
  description_hi: z.string().optional(),
  description_te: z.string().optional(),
  media: z.any().refine((files) => files?.length === 1, 'A media file is required.'),
  mediaType: z.enum(['video', 'short', 'bhajan', 'podcast', 'pravachan', 'audiobook']),
});

type FormValues = z.infer<typeof formSchema>;

export default function UploadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const storage = useStorage();
  const [user, loadingAuth] = useAuthState(auth);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadTaskRef = useRef<UploadTask | null>(null);
  const uploadInProgressRef = useRef(false);
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title_en: '',
      title_hi: '',
      title_te: '',
      description_en: '',
      description_hi: '',
      description_te: '',
      mediaType: 'video',
    }
  });

  const fileRef = form.register('media');

  // File size validation - support up to 5GB for long videos/audio (Firebase Storage limit)
  const MAX_VIDEO_SIZE = 1 * 1024 * 1024 * 1024; // 1GB hard limit for videos
  const MAX_AUDIO_SIZE = 1 * 1024 * 1024 * 1024; // 1GB hard limit for audio files
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const estimateUploadTime = (fileSize: number, uploadSpeedMbps: number = 10): { time: string; speed: string } => {
    // Convert bytes to megabits
    const sizeInMegabits = (fileSize * 8) / (1024 * 1024);
    
    // Calculate for different speeds
    const time10Mbps = sizeInMegabits / 10;
    const time20Mbps = sizeInMegabits / 20;
    
    const formatTime = (seconds: number): string => {
      if (seconds < 60) return `${Math.round(seconds)} seconds`;
      if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
      return `${Math.round(seconds / 3600)} hours and ${Math.round((seconds % 3600) / 60)} minutes`;
    };
    
    return {
      time: formatTime(time10Mbps),
      speed: `10 Mbps: ${formatTime(time10Mbps)} | 20 Mbps: ${formatTime(time20Mbps)}`
    };
  };

const onSubmit = async (data: FormValues) => {
    if (!user || !user.uid) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to upload media. Please wait or log in again.",
        });
        return;
    }

    try {
        await user.getIdToken(true);
    } catch (tokenError) {
        console.warn('Failed to refresh auth token before upload', tokenError);
    }

    const mediaFile = data.media[0];
    if (!mediaFile) {
        toast({ variant: 'destructive', title: 'No file selected.' });
        return;
    }

    // CRITICAL: Block .MOV files - they are not web-compatible
    const fileName = mediaFile.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    if (fileExtension === '.mov' || mediaFile.type === 'video/quicktime') {
        toast({
            variant: 'destructive',
            title: 'MOV files not supported',
            description: 'MOV files are not compatible with web browsers. Please convert your video to MP4 (H.264 + AAC) format before uploading. You can use tools like HandBrake, FFmpeg, or online converters.',
        });
        return;
    }

    // Validate file size based on file type
    const isVideo = mediaFile.type.startsWith('video/');
    const isAudio = mediaFile.type.startsWith('audio/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE : isAudio ? MAX_AUDIO_SIZE : MAX_VIDEO_SIZE;
    
    if (mediaFile.size > maxSize) {
        toast({
            variant: 'destructive',
            title: 'File too large',
            description: `${isVideo ? 'Videos' : 'Audio files'} must be less than ${formatFileSize(maxSize)}. Your file is ${formatFileSize(mediaFile.size)}.`,
        });
        return;
    }

    // Show upload time estimation
    const timeEstimate = estimateUploadTime(mediaFile.size);
    toast({
        title: 'Upload Started',
        description: `Uploading ${formatFileSize(mediaFile.size)}. Estimated: ${timeEstimate.time} (at 10 Mbps). ${timeEstimate.speed}`,
        duration: 6000,
    });
    // HARD LOCK: prevent duplicate/resumable conflicts
    if (uploadInProgressRef.current) {
      toast({
        variant: 'destructive',
        title: 'Upload already in progress',
        description: 'Please wait for the current upload to finish.',
      });
      return;
    }

    setIsUploading(true);
    uploadInProgressRef.current = true;

    // Cancel any previous upload task if it somehow exists
    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
      uploadTaskRef.current = null;
    }
    
    try {
      const mediaId = doc(collection(db, 'media')).id;

      // SAFE FILENAME: aggressive sanitization + UUID to avoid session conflicts
      const sanitizedBaseName = mediaFile.name
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_{2,}/g, "_")
        .replace(/^_+|_+$/g, "");
      const safeName = `${crypto.randomUUID()}-${sanitizedBaseName}`;

      // Use default Firebase Storage for ALL uploads (videos and non-videos)
      const storagePath = `media/${user.uid}/${mediaId}/${safeName}`;
      const storageRef = ref(storage, storagePath);

      // Infer content type from file extension if not provided
      let contentType = mediaFile.type;
      if (!contentType) {
        const ext = mediaFile.name.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
          'mp4': 'video/mp4',
          'mov': 'video/quicktime',
          'avi': 'video/x-msvideo',
          'webm': 'video/webm',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
        };
        contentType = ext ? mimeTypes[ext] || 'application/octet-stream' : 'application/octet-stream';
      }

      const uploadTask = uploadBytesResumable(storageRef, mediaFile, {
        contentType: contentType,
      });
      uploadTaskRef.current = uploadTask;
      
      let fixedURL: string;
      let uploadedStoragePath: string;
      
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            uploadTaskRef.current = null;
            uploadInProgressRef.current = false;
            reject(error);
          },
          async () => {
            try {
              fixedURL = await getDownloadURL(uploadTask.snapshot.ref);
              uploadedStoragePath = storagePath;
              resolve();
            } catch (urlError) {
              uploadTaskRef.current = null;
              uploadInProgressRef.current = false;
              reject(urlError);
            }
          }
        );
      });

      // Start a transition *after* the upload is complete to handle doc creation
      startTransition(async () => {
          try {

                // MOCK MODERATION for development
                const moderationResult = { isAppropriate: true, reason: "Auto-approved in dev mode." };
    
                if (!moderationResult.isAppropriate) {
                  toast({
                    variant: 'destructive',
                    title: 'Content Moderation Failed',
                    description: moderationResult.reason,
                    duration: 9000,
                  });
                  setIsUploading(false);
                  return;
                }
                
                const mediaDocRef = doc(db, 'media', mediaId);
                
                // Get video dimensions if available (from file metadata)
                const videoDimensions = (mediaFile as any)?.videoDimensions;
                
                const mediaData: any = {
                    id: mediaId,
                    creatorId: user.uid,
                    userId: user.uid, // For consistency with other collections
                    title_en: data.title_en,
                    title_hi: data.title_hi || '',
                    title_te: data.title_te || '',
                    description_en: data.description_en,
                    description_hi: data.description_hi || '',
                    description_te: data.description_te || '',
                    mediaUrl: fixedURL,
                    thumbnailUrl: `https://picsum.photos/seed/${mediaId}/800/450`,
                    uploadDate: serverTimestamp(),
                    mediaType: data.mediaType,
                    status: 'approved',
                    duration: 0, 
                    language: 'en',
                    tags: [data.mediaType],
                    likes: 0,
                    views: 0,
                    // Store video dimensions and orientation for filtering
                    ...(videoDimensions && {
                        videoWidth: videoDimensions.width,
                        videoHeight: videoDimensions.height,
                        videoAspectRatio: videoDimensions.aspectRatio,
                        videoOrientation: videoDimensions.orientation,
                    }),
                };
                
                // Store storage path to prevent truncation issues
                mediaData.mediaStoragePath = uploadedStoragePath;

                await setDoc(mediaDocRef, mediaData);
                
                toast({
                    title: 'Upload Complete!',
                    description: 'Your video has been published and will appear in the "For You" feed shortly!',
                });
                // Redirect to feed so users can see their content
                router.push('/feed');

            } catch(error) {
                console.error('Failed to save uploaded media', error);
                const firebaseError = error as FirebaseError;
                if (firebaseError?.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: `media/${mediaId}`,
                        operation: 'create',
                        requestResourceData: data,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    toast({
                        variant: 'destructive',
                        title: 'Permission Denied',
                        description: 'You do not have rights to publish media. Please contact support if this seems incorrect.',
                    });
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Could not finish upload',
                        description: firebaseError?.message || 'Please try again in a moment.',
                    });
                }
            } finally {
                setIsUploading(false);
                uploadTaskRef.current = null;
                uploadInProgressRef.current = false;
            }
        });
    } catch (uploadError: any) {
      console.error("Upload failed:", uploadError);
      setIsUploading(false);
      uploadTaskRef.current = null;
      uploadInProgressRef.current = false;
      if (uploadError.code === 'storage/unauthorized') {
        toast({ variant: "destructive", title: "Permission Denied", description: "You do not have permission to upload. Please ensure you are logged in correctly." });
      } else {
        toast({ variant: "destructive", title: "File Upload Failed", description: uploadError.message || "Could not upload your file. Please try again." });
      }
    }
  };

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16 flex justify-center">
        <Card className="w-full max-w-2xl bg-card">
        <CardHeader>
            <CardTitle>Upload Media</CardTitle>
            <CardDescription>Share your spiritual, religious, and wellness content with the community. All content must be positive and uplifting.</CardDescription>
        </CardHeader>
        <CardContent>
            {isUploading ? (
                 <div className="flex flex-col items-center justify-center h-40">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground mb-2">Uploading... please wait. Do not close this page.</p>
                    <Progress value={uploadProgress} className="w-full mb-2" />
                    <p className="text-sm text-muted-foreground">{Math.round(uploadProgress)}% complete</p>
                 </div>
            ) : (
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                    control={form.control}
                    name="title_en"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Title (English)</FormLabel>
                        <FormControl>
                            <Input placeholder="E.g., Morning Yoga for Positive Energy" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="title_hi"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Title (Hindi)</FormLabel>
                        <FormControl>
                            <Input placeholder="उदा., सकारात्मक ऊर्जा के लिए सुबह का योग" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="title_te"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Title (Telugu)</FormLabel>
                        <FormControl>
                            <Input placeholder="ఉదా., సానుకూల శక్తి కోసం ఉదయం యోగా" {...field} />
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
                        <FormLabel>Description (English)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="A short summary of your media's positive message" {...field} />
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
                        <FormLabel>Description (Hindi)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="आपके मीडिया के सकारात्मक संदेश का संक्षिप्त सारांश" {...field} />
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
                        <FormLabel>Description (Telugu)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="మీ మీడియా యొక్క సానుకూల సందేశం యొక్క చిన్న సారాంశం" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="mediaType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Media Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a media type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="short">Short</SelectItem>
                            <SelectItem value="bhajan">Bhajan</SelectItem>
                            <SelectItem value="podcast">Podcast</SelectItem>
                            <SelectItem value="pravachan">Pravachan</SelectItem>
                            <SelectItem value="audiobook">Audiobook</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="media"
                    render={({ field }) => {
                        const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const isVideo = file.type.startsWith('video/');
                                const isAudio = file.type.startsWith('audio/');
                                const maxSize = isVideo ? MAX_VIDEO_SIZE : isAudio ? MAX_AUDIO_SIZE : MAX_VIDEO_SIZE;
                                
                                if (file.size > maxSize) {
                                    toast({
                                        variant: 'destructive',
                                        title: 'File too large',
                                        description: `${isVideo ? 'Videos' : 'Audio files'} must be less than ${formatFileSize(maxSize)}. Your file is ${formatFileSize(file.size)}.`,
                                    });
                                    e.target.value = ''; // Clear the file input
                                    return;
                                }
                                
                                // Detect aspect ratio for videos
                                if (isVideo) {
                                    try {
                                        const { detectVideoAspectRatio } = await import('@/utils/video-aspect-ratio');
                                        const dimensions = await detectVideoAspectRatio(file);
                                        // Store dimensions in file metadata for later use
                                        (file as any).videoDimensions = dimensions;
                                    } catch (error) {
                                        console.error('Failed to detect video aspect ratio:', error);
                                        // Continue with upload even if aspect ratio detection fails
                                    }
                                }
                                
                                // Show file info and estimated upload time
                                const timeEstimate = estimateUploadTime(file.size);
                                toast({
                                    title: 'File Selected',
                                    description: `${formatFileSize(file.size)} - Upload time: ${timeEstimate.speed}`,
                                    duration: 5000,
                                });
                            }
                            fileRef.onChange(e);
                        };
                        
                        return (
                            <FormItem>
                                <FormLabel>Media File (Video or Audio)</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="file" 
                                        accept="video/*,audio/*" 
                                        {...fileRef}
                                        onChange={handleFileChange}
                                    />
                                </FormControl>
                                <FormMessage />
                                <p className="text-sm text-muted-foreground mt-1">
                                    Supported: Videos up to 5GB, Audio up to 2GB.<br/>
                                    <strong>Upload Times:</strong> 8-10 min videos (~300-500MB): 4-8 minutes | 30 min videos (~1GB): 13-15 min | 60 min videos (~2GB): 25-30 min (at 10 Mbps upload speed).
                                </p>
                            </FormItem>
                        );
                    }}
                    />
                    <Button type="submit" className="w-full" disabled={isUploading || isPending || loadingAuth}>
                        {isPending || loadingAuth ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Upload & Publish
                    </Button>
                </form>
                </Form>
            )}
        </CardContent>
        </Card>
    </main>
  );
}
