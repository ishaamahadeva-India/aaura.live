
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
import { useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useFirestore } from '@/lib/firebase/provider';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import type { Challenge } from '@/lib/challenges';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import type { DocumentData } from 'firebase/firestore';

const taskSchema = z.object({
  day: z.coerce.number().min(1),
  title: z.string().min(1, 'Title is required'),
  taskType: z.enum(['read-story', 'watch-media', 'recite-mantra']),
  contentId: z.string().min(1, 'Content ID/slug is required'),
});

const formSchema = z.object({
  title_en: z.string().min(1, 'English title is required.'),
  title_hi: z.string().optional(),
  description_en: z.string().min(1, 'English description is required.'),
  description_hi: z.string().optional(),
  durationDays: z.coerce.number().min(1),
  badgeId: z.string().min(1, 'Badge ID is required.'),
  tasks: z.array(taskSchema).min(1, 'At least one task is required.'),
});

type FormValues = z.infer<typeof formSchema>;

interface ChallengeFormProps {
  challenge?: Challenge;
}

export function ChallengeForm({ challenge }: ChallengeFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const db = useFirestore();
  const [isPending, startTransition] = useTransition();

  const [mediaSnapshot, mediaLoading] = useCollection(collection(db, 'media'));
  const mediaOptions = useMemo(() => {
    if (!mediaSnapshot) return [];
    return mediaSnapshot.docs.map(doc => ({
      value: doc.id,
      label: doc.data().title_en || 'Unnamed Video',
    }));
  }, [mediaSnapshot]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: challenge || {
      title_en: '',
      title_hi: '',
      description_en: '',
      description_hi: '',
      durationDays: 7,
      badgeId: '',
      tasks: [],
    },
  });

  const { fields: taskFields, append: appendTask, remove: removeTask } = useFieldArray({
    control: form.control,
    name: "tasks",
  });
  
  const watchedTasks = form.watch('tasks');

  const title = challenge ? `Edit ${challenge.title_en}` : 'Create a New Challenge';
  const description = challenge ? 'Update the details for this challenge.' : 'Fill out the form to add a new challenge to the app.';

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const challengeId = challenge ? challenge.id : doc(collection(db, 'challenges')).id;
      const challengeRef = doc(db, 'challenges', challengeId);
      
      const fullData = {
        id: challengeId,
        ...data
      };

      setDoc(challengeRef, fullData, { merge: true }).then(() => {
        toast({ title: challenge ? 'Challenge Updated' : 'Challenge Created!', description: 'The challenge is now live.' });
        router.push('/admin/content?tab=challenges');
      }).catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: challengeRef.path,
            operation: challenge ? 'update' : 'create',
            requestResourceData: fullData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
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
            <FormField control={form.control} name="title_en" render={({ field }) => (
              <FormItem><FormLabel>Title (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description_en" render={({ field }) => (
              <FormItem><FormLabel>Description (English)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="durationDays" render={({ field }) => (
                <FormItem><FormLabel>Duration (Days)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="badgeId" render={({ field }) => (
                <FormItem><FormLabel>Badge ID</FormLabel><FormDescription>ID of badge awarded on completion.</FormDescription><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Tasks</h3>
              <div className="space-y-4">
                {taskFields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeTask(index)} className="absolute top-2 right-2 h-6 w-6">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name={`tasks.${index}.day`} render={({ field }) => (
                        <FormItem><FormLabel>Day</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`tasks.${index}.title`} render={({ field }) => (
                        <FormItem><FormLabel>Task Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name={`tasks.${index}.taskType`} render={({ field }) => (
                            <FormItem><FormLabel>Task Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                <SelectContent>
                                <SelectItem value="read-story">Read Story</SelectItem>
                                <SelectItem value="watch-media">Watch Media</SelectItem>
                                <SelectItem value="recite-mantra">Recite Mantra</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage /></FormItem>
                        )} />
                        
                        {watchedTasks[index]?.taskType === 'watch-media' ? (
                             <FormField control={form.control} name={`tasks.${index}.contentId`} render={({ field }) => (
                                <FormItem><FormLabel>Select Media</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger>
                                        <SelectValue placeholder={mediaLoading ? "Loading..." : "Select a video"} />
                                    </SelectTrigger></FormControl>
                                    <SelectContent>
                                        {mediaOptions.map(option => (
                                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage /></FormItem>
                            )} />
                        ) : (
                            <FormField control={form.control} name={`tasks.${index}.contentId`} render={({ field }) => (
                                <FormItem><FormLabel>Content ID / Slug / Mantra</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        )}
                     </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => appendTask({ day: taskFields.length + 1, title: '', taskType: 'read-story', contentId: '' })} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Task
              </Button>
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {challenge ? 'Save Changes' : 'Create Challenge'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
