
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
import { doc, setDoc, serverTimestamp, collection, updateDoc, getDoc } from 'firebase/firestore';
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
  slug: z.string().min(1, "Slug is required."),
  name: z.object({ en: z.string().min(1, "English name is required.") }),
  officialWebsite: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
  deity: z.object({ name: z.object({ en: z.string().min(1, "Deity name is required.") }) }),
  location: z.object({
      address: z.string().min(1, "Address is required."),
      city: z.string().min(1, "City is required."),
      state: z.string().min(1, "State is required."),
      pincode: z.string().min(6, "Pincode is required."),
      geo: z.object({
          lat: z.coerce.number(),
          lng: z.coerce.number(),
      }),
  }),
  importance: z.object({
    mythological: z.object({ en: z.string().min(1, "Mythological importance is required.") }),
    historical: z.object({ en: z.string().optional() }),
  }),
  media: z.object({
      images: z.array(imageSchema).min(1, "At least one image is required."),
  }),
  visitingInfo: z.object({
      timings: z.object({ en: z.string().min(1, "Timings are required.") }),
      festivals: z.object({ en: z.string().optional() }),
      dressCode: z.object({ en: z.string().optional() }),
      poojaGuidelines: z.object({ en: z.string().optional() }),
  }),
  nearbyInfo: z.object({
      placesToVisit: z.array(z.object({ name: z.string().optional(), description: z.string().optional() })).optional(),
      accommodation: z.array(z.object({ name: z.string().optional(), phone: z.string().optional() })).optional(),
      food: z.array(z.object({ name: z.string().optional(), phone: z.string().optional() })).optional(),
      transport: z.array(z.object({ name: z.string().optional(), phone: z.string().optional() })).optional(),
      guides: z.array(z.object({ name: z.string().optional(), phone: z.string().optional() })).optional(),
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface TempleFormProps {
  temple?: any;
}

export function TempleForm({ temple }: TempleFormProps) {
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
    defaultValues: temple ? {
        ...temple,
        officialWebsite: temple.officialWebsite || '',
    } : {
      slug: '',
      name: { en: '' },
      officialWebsite: '',
      deity: { name: { en: '' } },
      location: { city: '', state: '', pincode: '', address: '', geo: { lat: 0, lng: 0 } },
      importance: { mythological: { en: '' }, historical: { en: '' } },
      media: { images: [{ url: '', hint: '' }] },
      visitingInfo: { timings: { en: '' } },
      nearbyInfo: {
        placesToVisit: [{name: '', description: ''}],
        accommodation: [{name: '', phone: ''}],
        food: [{name: '', phone: ''}],
        transport: [{name: '', phone: ''}],
        guides: [{name: '', phone: ''}],
      },
    },
  });

  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({ control: form.control, name: "media.images" });
  const { fields: guideFields, append: appendGuide, remove: removeGuide } = useFieldArray({ control: form.control, name: "nearbyInfo.guides" });
  const { fields: transportFields, append: appendTransport, remove: removeTransport } = useFieldArray({ control: form.control, name: "nearbyInfo.transport" });
  const { fields: foodFields, append: appendFood, remove: removeFood } = useFieldArray({ control: form.control, name: "nearbyInfo.food" });
  const { fields: accommodationFields, append: appendAccommodation, remove: removeAccommodation } = useFieldArray({ control: form.control, name: "nearbyInfo.accommodation" });
  const { fields: placesToVisitFields, append: appendPlaceToVisit, remove: removePlaceToVisit } = useFieldArray({ control: form.control, name: "nearbyInfo.placesToVisit" });

  const titleText = temple ? `Edit ${temple.name.en}` : 'Add a New Temple';
  const descriptionText = temple ? 'Update the details for this temple.' : 'Fill out the form to add a new temple to the database.';

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const templeId = temple ? temple.id : data.slug;

      if (!temple) {
        const existingDoc = await getDoc(doc(db, 'temples', templeId));
        if (existingDoc.exists()) {
          form.setError('slug', {
            type: 'manual',
            message: 'This slug is already in use. Please choose a unique one.',
          });
          toast({ variant: 'destructive', title: 'Slug already exists' });
          return;
        }
      }

      const templeRef = doc(db, 'temples', templeId);
      
      const serializableImages = data.media.images.map(img => ({
        url: img.url || `https://picsum.photos/seed/${templeId}-${Math.random()}/800/600`,
        hint: img.hint,
      }));

      const fullData = { 
        id: templeId,
        ...data,
        media: {
            images: serializableImages,
        },
        officialWebsite: data.officialWebsite || null,
        status: isSuperAdmin ? 'published' : 'pending',
        updatedAt: serverTimestamp(),
        ...(temple ? {} : { 
          createdAt: serverTimestamp(),
          ...(isSuperAdmin ? {} : { submittedBy: user?.uid || null })
        }),
      };
      
      try {
        await setDoc(templeRef, fullData, { merge: true });

        if (isSuperAdmin) {
          toast({ title: `Temple ${temple ? 'Updated' : 'Created'}!`, description: 'The temple is now live.' });
        } else {
          toast({ title: 'Temple Submitted!', description: 'Your submission has been sent for admin approval. You will be notified once it is reviewed.' });
        }
        router.push('/admin/content?tab=temples');

        data.media.images.forEach((image, index) => {
            if (image.file) {
                const file = image.file as File;
                toast({ title: `Uploading image ${index + 1}...`});
                const storageRef = ref(storage, `content-images/temples/${templeId}-${Date.now()}_${file.name}`);
                uploadBytes(storageRef, file).then(snapshot => {
                    getDownloadURL(snapshot.ref).then(finalImageUrl => {
                        updateDoc(templeRef, { [`media.images.${index}.url`]: finalImageUrl });
                    });
                });
            }
        });

      } catch (serverError) {
        const permissionError = new FirestorePermissionError({
            path: templeRef.path,
            operation: 'write',
            requestResourceData: fullData,
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    });
  };
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{titleText}</CardTitle>
        <CardDescription>{descriptionText}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <h3 className="text-xl font-semibold text-primary">Basic Information</h3>
            <FormField control={form.control} name="slug" render={({ field }) => (
              <FormItem><FormLabel>Slug</FormLabel><FormDescription>Unique identifier for the URL (e.g., 'ram-mandir-ayodhya').</FormDescription><FormControl><Input {...field} disabled={!!temple} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="name.en" render={({ field }) => (
              <FormItem><FormLabel>Name (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="officialWebsite" render={({ field }) => (
              <FormItem><FormLabel>Official Website</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="deity.name.en" render={({ field }) => (
              <FormItem><FormLabel>Primary Deity</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <Separator />
            <h3 className="text-xl font-semibold text-primary">Location</h3>
            <FormField control={form.control} name="location.address" render={({ field }) => (
              <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="location.city" render={({ field }) => (
                <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="location.state" render={({ field }) => (
                <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="location.pincode" render={({ field }) => (
                <FormItem><FormLabel>Pincode</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="location.geo.lat" render={({ field }) => (
                <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="location.geo.lng" render={({ field }) => (
                <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <Separator />
            <h3 className="text-xl font-semibold text-primary">Importance & Significance</h3>
            <FormField control={form.control} name="importance.mythological.en" render={({ field }) => (
                <FormItem><FormLabel>Mythological Importance</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="importance.historical.en" render={({ field }) => (
                <FormItem><FormLabel>Historical Importance</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />


            <Separator />
            <h3 className="text-xl font-semibold text-primary">Media</h3>
             <div>
              <h3 className="text-lg font-medium mb-2">Images</h3>
              {imageFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start mb-4 border p-4 rounded-md">
                   <div className="space-y-4">
                     <FormField
                        control={form.control}
                        name={`media.images.${index}.file`}
                        render={() => (
                           <FormItem>
                                <FormLabel>Temple Image {index + 1}</FormLabel>
                                <FormControl>
                                    <ImageUpload
                                        onFileSelect={(file) => form.setValue(`media.images.${index}.file`, file)}
                                        initialUrl={form.getValues(`media.images.${index}.url`)}
                                        folderName={`content-images/temples`}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                      />
                    <FormField control={form.control} name={`media.images.${index}.hint`} render={({ field }) => (
                      <FormItem><FormLabel>Image Hint</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
            <h3 className="text-xl font-semibold text-primary">Visitor Information</h3>
            <FormField control={form.control} name="visitingInfo.timings.en" render={({ field }) => (
                <FormItem><FormLabel>Timings</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="visitingInfo.festivals.en" render={({ field }) => (
                <FormItem><FormLabel>Festivals</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="visitingInfo.dressCode.en" render={({ field }) => (
                <FormItem><FormLabel>Dress Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="visitingInfo.poojaGuidelines.en" render={({ field }) => (
                <FormItem><FormLabel>Pooja Guidelines</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <Separator />
            <h3 className="text-xl font-semibold text-primary">Nearby Information & Suggestions</h3>
            
            {/* Guides */}
            <div>
              <h4 className="text-lg font-medium mb-2">Suggested Guides</h4>
              {guideFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-start mb-4 border p-4 rounded-md">
                   <FormField control={form.control} name={`nearbyInfo.guides.${index}.name`} render={({ field }) => (
                      <FormItem><FormLabel>Guide Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`nearbyInfo.guides.${index}.phone`} render={({ field }) => (
                      <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeGuide(index)} className="mt-8">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendGuide({ name: '', phone: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Guide
              </Button>
            </div>
            
            {/* Transport */}
            <div className="mt-4">
              <h4 className="text-lg font-medium mb-2">Suggested Transport / Travel Agents</h4>
              {transportFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-start mb-4 border p-4 rounded-md">
                   <FormField control={form.control} name={`nearbyInfo.transport.${index}.name`} render={({ field }) => (
                      <FormItem><FormLabel>Agent/Service Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`nearbyInfo.transport.${index}.phone`} render={({ field }) => (
                      <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeTransport(index)} className="mt-8">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendTransport({ name: '', phone: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Transport
              </Button>
            </div>

            {/* Food */}
            <div className="mt-4">
              <h4 className="text-lg font-medium mb-2">Suggested Food / Restaurants</h4>
              {foodFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-start mb-4 border p-4 rounded-md">
                   <FormField control={form.control} name={`nearbyInfo.food.${index}.name`} render={({ field }) => (
                      <FormItem><FormLabel>Restaurant Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`nearbyInfo.food.${index}.phone`} render={({ field }) => (
                      <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeFood(index)} className="mt-8">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendFood({ name: '', phone: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Restaurant
              </Button>
            </div>

            {/* Accommodation */}
            <div className="mt-4">
              <h4 className="text-lg font-medium mb-2">Suggested Accommodation</h4>
              {accommodationFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-start mb-4 border p-4 rounded-md">
                   <FormField control={form.control} name={`nearbyInfo.accommodation.${index}.name`} render={({ field }) => (
                      <FormItem><FormLabel>Hotel/Dharamshala Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`nearbyInfo.accommodation.${index}.phone`} render={({ field }) => (
                      <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeAccommodation(index)} className="mt-8">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendAccommodation({ name: '', phone: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Accommodation
              </Button>
            </div>

            {/* Places to Visit */}
            <div className="mt-4">
              <h4 className="text-lg font-medium mb-2">Other Places to Visit</h4>
              {placesToVisitFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-start mb-4 border p-4 rounded-md">
                   <FormField control={form.control} name={`nearbyInfo.placesToVisit.${index}.name`} render={({ field }) => (
                      <FormItem><FormLabel>Place Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`nearbyInfo.placesToVisit.${index}.description`} render={({ field }) => (
                      <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" variant="destructive" size="icon" onClick={() => removePlaceToVisit(index)} className="mt-8">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendPlaceToVisit({ name: '', description: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Place
              </Button>
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {temple ? 'Save Changes' : 'Create Temple'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
