'use client';

import { useState, useTransition, useRef, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth, useFirebase, useFirestore, useStorage } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Image as ImageIcon, Video, X, FileQuestion, MessageSquare, Sparkles, BarChart3, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, uploadBytesResumable, UploadTask, getMetadata } from 'firebase/storage';
// Removed: uploadVideoToOriginalsBucket - using Firebase SDK directly instead
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import NextImage from 'next/image';
import { Progress } from '@/components/ui/progress';
import { FirebaseError } from 'firebase/app';

const postSchema = z.object({
  content: z.string().min(10, "Post must be at least 10 characters.").max(2000, "Post must be less than 2000 characters."),
  postType: z.enum(['update', 'question', 'experience', 'general', 'survey']).default('general'),
  // Survey fields
  surveyOptions: z.array(z.string().min(1, "Option cannot be empty")).optional(),
  // Question fields
  questionOptions: z.array(z.string().min(1, "Option cannot be empty")).optional(),
  correctAnswer: z.number().optional(),
}).refine((data) => {
  if (data.postType === 'survey') {
    return data.surveyOptions && data.surveyOptions.length >= 2;
  }
  return true;
}, {
  message: "Survey must have at least 2 options",
  path: ["surveyOptions"],
}).refine((data) => {
  if (data.postType === 'question') {
    return data.questionOptions && data.questionOptions.length >= 2 && data.correctAnswer !== undefined;
  }
  return true;
}, {
  message: "Question must have at least 2 options and a correct answer selected",
  path: ["questionOptions"],
});

type PostFormValues = z.infer<typeof postSchema>;

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated?: () => void;
}

export function CreatePostDialog({ open, onOpenChange, onPostCreated }: CreatePostDialogProps) {
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const { app } = useFirebase();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingType, setUploadingType] = useState<'image' | 'video' | 'cover' | null>(null);
  const uploadTaskRef = useRef<UploadTask | null>(null);
  // FIX #1: HARD LOCK upload (NON-NEGOTIABLE) - prevents duplicate uploads
  const uploadInProgressRef = useRef(false);
  const imageUploadInputRef = useRef<HTMLInputElement>(null);
  const videoUploadInputRef = useRef<HTMLInputElement>(null);
  const coverPhotoUploadInputRef = useRef<HTMLInputElement>(null);
  
  // Survey and Question state
  const [surveyOptions, setSurveyOptions] = useState<string[]>(['', '']);
  const [questionOptions, setQuestionOptions] = useState<string[]>(['', '']);
  const [correctAnswer, setCorrectAnswer] = useState<number | undefined>(undefined);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      content: '',
      postType: 'general',
      surveyOptions: [],
      questionOptions: [],
      correctAnswer: undefined,
    },
  });

  // Watch postType to reset survey/question fields when changing
  const postType = form.watch('postType');
  
  // Reset survey/question fields when post type changes
  useEffect(() => {
    if (postType !== 'survey') {
      setSurveyOptions(['', '']);
      form.setValue('surveyOptions', []);
    }
    if (postType !== 'question') {
      setQuestionOptions(['', '']);
      setCorrectAnswer(undefined);
      form.setValue('questionOptions', []);
      form.setValue('correctAnswer', undefined);
    }
  }, [postType, form]);

  // Survey option handlers
  const addSurveyOption = () => {
    if (surveyOptions.length < 10) {
      setSurveyOptions([...surveyOptions, '']);
    }
  };

  const removeSurveyOption = (index: number) => {
    if (surveyOptions.length > 2) {
      const newOptions = surveyOptions.filter((_, i) => i !== index);
      setSurveyOptions(newOptions);
      form.setValue('surveyOptions', newOptions.filter(opt => opt.trim() !== ''));
    }
  };

  const updateSurveyOption = (index: number, value: string) => {
    const newOptions = [...surveyOptions];
    newOptions[index] = value;
    setSurveyOptions(newOptions);
    form.setValue('surveyOptions', newOptions.filter(opt => opt.trim() !== ''));
  };

  // Question option handlers
  const addQuestionOption = () => {
    if (questionOptions.length < 6) {
      setQuestionOptions([...questionOptions, '']);
    }
  };

  const removeQuestionOption = (index: number) => {
    if (questionOptions.length > 2) {
      const newOptions = questionOptions.filter((_, i) => i !== index);
      setQuestionOptions(newOptions);
      form.setValue('questionOptions', newOptions.filter(opt => opt.trim() !== ''));
      // Reset correct answer if it was the removed option
      if (correctAnswer === index) {
        setCorrectAnswer(undefined);
        form.setValue('correctAnswer', undefined);
      } else if (correctAnswer !== undefined && correctAnswer > index) {
        setCorrectAnswer(correctAnswer - 1);
        form.setValue('correctAnswer', correctAnswer - 1);
      }
    }
  };

  const updateQuestionOption = (index: number, value: string) => {
    const newOptions = [...questionOptions];
    newOptions[index] = value;
    setQuestionOptions(newOptions);
    form.setValue('questionOptions', newOptions.filter(opt => opt.trim() !== ''));
  };

  const handleCorrectAnswerChange = (index: number) => {
    setCorrectAnswer(index);
    form.setValue('correctAnswer', index);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Image must be less than 10MB.',
        });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please select an image file.',
        });
        return;
      }
      setImageFile(file);
      setVideoFile(null); // Remove video if image is selected
      setVideoPreview(null);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // CRITICAL: Block .MOV files - they are not web-compatible
      const fileName = file.name.toLowerCase();
      const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
      if (fileExtension === '.mov' || file.type === 'video/quicktime') {
        toast({
          variant: 'destructive',
          title: 'MOV files not supported',
          description: 'MOV files are not compatible with web browsers. Please convert your video to MP4 (H.264 + AAC) format before uploading. You can use tools like HandBrake, FFmpeg, or online converters.',
        });
        return;
      }

      // Safer hard limit for very large videos to control billing and failures
      // Change these two constants if you want to allow bigger/smaller files
      const MAX_VIDEO_SIZE = 1 * 1024 * 1024 * 1024; // 1GB hard limit
      const LARGE_VIDEO_WARNING_SIZE = 500 * 1024 * 1024; // 500MB warning
      if (file.size > MAX_VIDEO_SIZE) {
        const fileSizeGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: `Video must be less than 1GB. Your file is ${fileSizeGB}GB. Please compress or trim your video before uploading.`,
        });
        return;
      }
      
      // Warn about large files (but still allow up to MAX_VIDEO_SIZE)
      if (file.size > LARGE_VIDEO_WARNING_SIZE) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(0);
        const estimatedMinutes = Math.max(
          1,
          Math.round((file.size * 8) / (5 * 1024 * 1024 * 1024) * 60) // Estimate at ~5 Mbps
        );
        toast({
          title: 'Large file detected',
          description: `File size: ~${fileSizeMB}MB. Estimated upload time: ~${estimatedMinutes} minutes on an average connection. Please keep this page open and avoid closing the browser.`,
          duration: 8000,
        });
      }
      if (!file.type.startsWith('video/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please select a video file.',
        });
        return;
      }
      
      // Detect aspect ratio
      try {
        const { detectVideoAspectRatio } = await import('@/utils/video-aspect-ratio');
        const dimensions = await detectVideoAspectRatio(file);
        // Store dimensions in file metadata for later use
        (file as any).videoDimensions = dimensions;
        setVideoFile(file);
        setImageFile(null); // Remove image if video is selected
        setImagePreview(null);
        const objectUrl = URL.createObjectURL(file);
        setVideoPreview(objectUrl);
      } catch (error) {
        console.error('Failed to detect video aspect ratio:', error);
        // Continue with upload even if aspect ratio detection fails
        setVideoFile(file);
        setImageFile(null);
        setImagePreview(null);
        const objectUrl = URL.createObjectURL(file);
        setVideoPreview(objectUrl);
      }
    }
  };

  const handleCoverPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Cover photo must be less than 10MB.',
        });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please select an image file.',
        });
        return;
      }
      setCoverPhotoFile(file);
      const objectUrl = URL.createObjectURL(file);
      setCoverPhotoPreview(objectUrl);
    }
  };

  const cleanPreview = (preview: string | null) => {
    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
  };

  const resetMediaState = useCallback(() => {
    cleanPreview(imagePreview);
    cleanPreview(videoPreview);
    cleanPreview(coverPhotoPreview);
    setImageFile(null);
    setVideoFile(null);
    setCoverPhotoFile(null);
    setImagePreview(null);
    setVideoPreview(null);
    setCoverPhotoPreview(null);
  }, [imagePreview, videoPreview, coverPhotoPreview]);

  const cancelOngoingUpload = useCallback(() => {
    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
      uploadTaskRef.current = null;
    }
    // Release upload lock on cleanup
    uploadInProgressRef.current = false;
    setIsUploading(false);
    setUploadProgress(0);
    setUploadingType(null);
  }, []);

  const handleDialogToggle = (nextOpen: boolean) => {
    if (!nextOpen) {
      cancelOngoingUpload();
      resetMediaState();
      form.reset();
      setSurveyOptions(['', '']);
      setQuestionOptions(['', '']);
      setCorrectAnswer(undefined);
    }
    onOpenChange(nextOpen);
  };

  const removeImage = () => {
    cleanPreview(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const removeVideo = () => {
    cleanPreview(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    // Also remove cover photo when video is removed
    cleanPreview(coverPhotoPreview);
    setCoverPhotoFile(null);
    setCoverPhotoPreview(null);
  };

  const removeCoverPhoto = () => {
    cleanPreview(coverPhotoPreview);
    setCoverPhotoFile(null);
    setCoverPhotoPreview(null);
  };

  const onSubmit = async (data: PostFormValues) => {
    if (!user || !db || !storage) {
      toast({ 
        variant: 'destructive', 
        title: 'Authentication Error',
        description: 'You must be logged in and have proper permissions to post. Please try logging out and back in.' 
      });
      return;
    }

    // Verify user is authenticated and refresh token
    if (!user.uid) {
      toast({ 
        variant: 'destructive', 
        title: 'Authentication Error',
        description: 'User ID is missing. Please log out and log back in.' 
      });
      return;
    }

    startTransition(async () => {
      try {
        // Refresh auth token before upload to ensure permissions are valid
        let freshToken: string | null = null;
        try {
          freshToken = await user.getIdToken(true);
          if (!freshToken) {
            throw new Error('Failed to get auth token');
          }
        } catch (tokenError: any) {
          console.error('Failed to refresh auth token before upload', tokenError);
          toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'Failed to refresh authentication. Please log out and log back in, then try again.',
          });
          return;
        }

        setIsUploading(true);
        let imageUrl: string | null = null;
        let videoUrl: string | null = null;
        let coverPhotoUrl: string | null = null;

        // Production-grade Firebase SDK upload (NO retries, NO cleanFile, NO REST/XHR)
        const uploadMedia = async (file: File, type: 'image' | 'video'): Promise<{ url: string; path: string }> => {
          if (uploadInProgressRef.current) {
            throw new Error('Upload already in progress. Please wait.');
          }
          
          if (!storage || !user || !user.uid) {
            throw new Error('Storage or user not properly initialized.');
          }
          
          uploadInProgressRef.current = true;
          
          if (uploadTaskRef.current) {
            uploadTaskRef.current.cancel();
            uploadTaskRef.current = null;
          }
          
          setUploadingType(type);
          setUploadProgress(0);

          const userId = user.uid;
          if (!userId) {
            uploadInProgressRef.current = false;
            throw new Error('User ID is missing. Please log in again.');
          }

          return new Promise<{ url: string; path: string }>((resolve, reject) => {
            try {
              // 1️⃣ SAFE filename (sanitize ALL special characters, not just spaces)
              // Remove/replace problematic characters that can cause 412 errors
              const sanitizedBaseName = file.name
                .replace(/\s+/g, "_")           // Replace spaces with underscores
                .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace any other special chars with underscore
                .replace(/_{2,}/g, "_")         // Replace multiple underscores with single
                .replace(/^_+|_+$/g, "");       // Remove leading/trailing underscores
              const safeName = crypto.randomUUID() + "-" + sanitizedBaseName;
              const path = `posts/${userId}/${safeName}`;
              const storageRef = ref(storage, path);

              // 2️⃣ Upload metadata
              const metadata = {
                contentType: file.type || (type === 'video' ? 'video/mp4' : 'application/octet-stream'),
              };

              // 3️⃣ START UPLOAD (SDK HANDLES EVERYTHING)
              const uploadTask = uploadBytesResumable(storageRef, file, metadata);
              uploadTaskRef.current = uploadTask;

              uploadTask.on(
                'state_changed',
                // ✅ Progress
                (snapshot) => {
                  const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                  setUploadProgress(progress);
                },
                // ❌ Error
                (error: any) => {
                  uploadTaskRef.current = null;
                  uploadInProgressRef.current = false;
                  setUploadingType(null);
                  setUploadProgress(0);
                  
                  console.error('Firebase upload error:', error.code, error.message);
                  
                  let errorMessage = 'Upload failed. ';
                  if (error.code === 'storage/unauthorized') {
                    errorMessage += 'You do not have permission to upload files.';
                  } else if (error.code === 'storage/canceled') {
                    errorMessage += 'Upload was canceled.';
                  } else {
                    errorMessage += error.message || 'Please try again.';
                  }
                  
                  toast({
                    variant: 'destructive',
                    title: 'Upload Failed',
                    description: errorMessage,
                    duration: 5000,
                  });
                  
                  reject(error);
                },
                // ✅ Success
                async () => {
                  uploadTaskRef.current = null;
                  uploadInProgressRef.current = false;
                  setUploadingType(null);
                  setUploadProgress(100);
                  
                  try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({
                      url: downloadURL,
                      path: path,
                    });
                  } catch (urlError: any) {
                    reject(new Error(`Upload completed but failed to get URL: ${urlError?.message || 'Unknown error'}`));
                  }
                }
              );
            } catch (err: any) {
              uploadInProgressRef.current = false;
              setUploadingType(null);
              setUploadProgress(0);
              reject(err);
            }
          });
        };

        let videoStoragePath: string | null = null;

        if (imageFile) {
          const imageResult = await uploadMedia(imageFile, 'image');
          imageUrl = imageResult.url;
        }

        if (videoFile) {
          try {
            console.log('Starting video upload...', {
              fileName: videoFile.name,
              fileSize: videoFile.size,
              fileType: videoFile.type
            });
            const videoResult = await uploadMedia(videoFile, 'video');
            console.log('Video upload successful!', {
              url: videoResult.url.substring(0, 100),
              path: videoResult.path
            });
            videoUrl = videoResult.url;
            videoStoragePath = videoResult.path; // Store the storage path
          } catch (uploadError: any) {
            console.error('Video upload failed:', uploadError);
            toast({
              variant: 'destructive',
              title: 'Video Upload Failed',
              description: uploadError?.message || 'Failed to upload video. Please try again.',
              duration: 5000,
            });
            throw uploadError; // Re-throw to stop post creation
          }
        }

        // Upload cover photo if provided (only for videos)
        if (coverPhotoFile && videoFile) {
          try {
            // Upload cover photo to same folder as video
            const userId = user.uid;
            const coverFileName = `posts/${userId}/${Date.now()}-cover-${coverPhotoFile.name}`;
            const coverStorageRef = ref(storage, coverFileName);
            const coverUploadTask = uploadBytesResumable(coverStorageRef, coverPhotoFile);
            
            coverPhotoUrl = await new Promise<string>((resolve, reject) => {
              coverUploadTask.on(
                'state_changed',
                (snapshot) => {
                  const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                  setUploadProgress(progress);
                },
                (error) => reject(error),
                async () => {
                  const url = await getDownloadURL(coverUploadTask.snapshot.ref);
                  resolve(url);
                }
              );
            });
          } catch (coverError: any) {
            console.error('Cover photo upload failed:', coverError);
            toast({
              variant: 'destructive',
              title: 'Cover Photo Upload Failed',
              description: coverError?.message || 'Failed to upload cover photo. Post will be created without cover photo.',
              duration: 5000,
            });
            // Don't throw - continue without cover photo
          }
        }

        // Create post in Firestore (no contextId/contextType for general feed)
        const postsCollection = collection(db, 'posts');
        
        // Get video dimensions if available
        const videoDimensions = (videoFile as any)?.videoDimensions;
        
        const newPost: any = {
          authorId: user.uid,
          content: data.content,
          postType: data.postType,
          imageUrl: imageUrl || null,
          videoUrl: videoUrl || null,
          thumbnail: coverPhotoUrl || null, // Store cover photo as thumbnail
          createdAt: serverTimestamp(),
          likes: 0,
          commentsCount: 0,
          // Store video storage path to prevent truncation issues
          ...(videoStoragePath && {
            videoStoragePath,
            // Videos now upload to the originals bucket (processed outputs go to processed bucket via CF)
            videoStorageBucket: 'aaura-original-uploads',
          }),
          // Store video dimensions and orientation for filtering
          ...(videoDimensions && {
            videoWidth: videoDimensions.width,
            videoHeight: videoDimensions.height,
            videoAspectRatio: videoDimensions.aspectRatio,
            videoOrientation: videoDimensions.orientation,
          }),
          // Survey data
          ...(data.postType === 'survey' && data.surveyOptions && {
            surveyOptions: data.surveyOptions.filter(opt => opt.trim() !== ''),
            surveyResponses: {},
          }),
          // Question data
          ...(data.postType === 'question' && data.questionOptions && {
            questionOptions: data.questionOptions.filter(opt => opt.trim() !== ''),
            correctAnswer: data.correctAnswer,
            questionResponses: {},
          }),
          // No contextId or contextType - this makes it a general feed post
        };

        await addDoc(postsCollection, newPost);

        toast({
          title: 'Post created successfully!',
          description: 'Your post has been shared with the community and will appear in the feed shortly.',
        });

        // Call callback to refresh feed
        if (onPostCreated) {
          onPostCreated();
        }

        // Reset form
        form.reset();
        resetMediaState();
        onOpenChange(false);
      } catch (error: any) {
        console.error('Error creating post:', error);
        const firebaseError = error as FirebaseError;
        if (firebaseError?.code === 'storage/canceled') {
          toast({
            variant: 'default',
            title: 'Upload cancelled',
            description: 'Your media upload was cancelled.',
          });
          return;
        }
        if (firebaseError?.code === 'storage/unauthorized' || firebaseError?.code === 'storage/permission-denied') {
          toast({
            variant: 'destructive',
            title: 'Storage Permission Denied',
            description: 'You do not have permission to upload files. Please ensure you are logged in correctly and try again. If the issue persists, try logging out and back in.',
          });
          return;
        }
        if (firebaseError?.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: 'posts',
            operation: 'create',
            requestResourceData: {},
          });
          errorEmitter.emit('permission-error', permissionError);
          toast({
            variant: 'destructive',
            title: 'Permission Denied',
            description: 'You are not allowed to publish posts. Contact support if this is unexpected.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Failed to create post',
            description: firebaseError?.message || 'Please try again.',
          });
        }
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadingType(null);
        uploadTaskRef.current = null;
      }
    });
  };

  if (!user) {
    return null;
  }

  const handleCancel = () => {
    handleDialogToggle(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogToggle}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a Post</DialogTitle>
          <DialogDescription>
            Share an update, ask a question, or post an experience with the community.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-4 mb-4">
          <Avatar>
            <AvatarImage src={user.photoURL || undefined} />
            <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">{user.displayName || 'User'}</p>
            <p className="text-sm text-muted-foreground">What's on your mind?</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="postType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant={field.value === 'update' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => field.onChange('update')}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Update
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === 'question' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => field.onChange('question')}
                      >
                        <FileQuestion className="mr-2 h-4 w-4" />
                        Question
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === 'experience' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => field.onChange('experience')}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Experience
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === 'general' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => field.onChange('general')}
                      >
                        General
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === 'survey' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => field.onChange('survey')}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Survey
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={
                        postType === 'survey' 
                          ? "Enter your survey question..."
                          : postType === 'question'
                          ? "Enter your question..."
                          : "Share an update, ask a question, or post an experience..."
                      }
                      className="resize-none min-h-[120px]"
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Survey Options */}
            {postType === 'survey' && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Survey Options (at least 2, max 10)</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSurveyOption}
                    disabled={surveyOptions.length >= 10}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
                {surveyOptions.map((option, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updateSurveyOption(index, e.target.value)}
                      className="flex-1"
                    />
                    {surveyOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSurveyOption(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                {form.formState.errors.surveyOptions && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.surveyOptions.message}
                  </p>
                )}
              </div>
            )}

            {/* Question Options with Correct Answer */}
            {postType === 'question' && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Question Options (at least 2, max 6) - Select correct answer</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addQuestionOption}
                    disabled={questionOptions.length >= 6}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
                {questionOptions.map((option, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Button
                      type="button"
                      variant={correctAnswer === index ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => handleCorrectAnswerChange(index)}
                      title={correctAnswer === index ? 'Correct Answer' : 'Mark as Correct Answer'}
                      disabled={!option.trim()}
                    >
                      {correctAnswer === index ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2" />
                      )}
                    </Button>
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updateQuestionOption(index, e.target.value)}
                      className="flex-1"
                    />
                    {questionOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestionOption(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                {form.formState.errors.questionOptions && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.questionOptions.message}
                  </p>
                )}
                {form.formState.errors.correctAnswer && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.correctAnswer.message}
                  </p>
                )}
              </div>
            )}

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative rounded-lg overflow-hidden border">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 z-10"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
                <NextImage
                  src={imagePreview}
                  alt="Preview"
                  width={800}
                  height={400}
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>
            )}

            {/* Video Preview */}
            {videoPreview && (
              <div className="relative rounded-lg overflow-hidden border">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 z-10"
                  onClick={removeVideo}
                >
                  <X className="h-4 w-4" />
                </Button>
                <video
                  src={videoPreview}
                  controls
                  className="w-full h-auto max-h-96"
                />
              </div>
            )}

            {/* Cover Photo Preview (only shown when video is selected) */}
            {coverPhotoPreview && videoFile && (
              <div className="relative rounded-lg overflow-hidden border">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 z-10"
                  onClick={removeCoverPhoto}
                >
                  <X className="h-4 w-4" />
                </Button>
                <NextImage
                  src={coverPhotoPreview}
                  alt="Cover photo preview"
                  width={800}
                  height={450}
                  className="w-full h-auto max-h-96 object-cover"
                />
                <p className="text-xs text-muted-foreground p-2 bg-background/80">
                  Cover photo will be used as thumbnail for your video
                </p>
              </div>
            )}

            {/* File Upload Buttons */}
            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
                ref={imageUploadInputRef}
                disabled={isPending || isUploading || !!videoFile}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => imageUploadInputRef.current?.click()}
                disabled={isPending || isUploading || !!videoFile}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                {imageFile ? 'Change Image' : 'Add Image'}
              </Button>

              <Input
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
                id="video-upload"
                ref={videoUploadInputRef}
                disabled={isPending || isUploading || !!imageFile}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => videoUploadInputRef.current?.click()}
                disabled={isPending || isUploading || !!imageFile}
              >
                <Video className="mr-2 h-4 w-4" />
                {videoFile ? 'Change Video' : 'Add Video'}
              </Button>
              
              {/* Cover Photo Upload (only shown when video is selected) */}
              {videoFile && (
                <>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverPhotoSelect}
                    className="hidden"
                    id="cover-photo-upload"
                    ref={coverPhotoUploadInputRef}
                    disabled={isPending || isUploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => coverPhotoUploadInputRef.current?.click()}
                    disabled={isPending || isUploading}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {coverPhotoFile ? 'Change Cover' : 'Add Cover Photo'}
                  </Button>
                </>
              )}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {uploadingType
                    ? `${uploadingType === 'video' ? 'Uploading video' : 'Uploading image'} ${uploadProgress}%`
                    : 'Saving your post...'}
                </p>
                <Progress value={uploadingType ? uploadProgress : 100} />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending && !isUploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || isUploading}>
                {isPending || isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploading ? 'Uploading...' : 'Posting...'}
                  </>
                ) : (
                  'Post'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

