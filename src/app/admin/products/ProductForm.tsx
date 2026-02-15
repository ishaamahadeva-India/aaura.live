
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
import { Loader2 } from 'lucide-react';
import { useFirestore, useStorage } from '@/lib/firebase/provider';
import { doc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import type { Product } from '@/lib/products';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { ImageUpload } from '@/components/ImageUpload';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const formSchema = z.object({
  name_en: z.string().min(1, 'English name is required.'),
  name_hi: z.string().optional(),
  description_en: z.string().min(1, 'English description is required.'),
  description_hi: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be a positive number.'),
  originalPrice: z.coerce.number().optional(),
  imageUrl: z.string().optional(),
  imageFile: z.any().optional(),
  imageHint: z.string().optional(),
  category: z.string().min(1, 'Category is required.'),
  shopId: z.string().min(1, 'Shop ID is required.'),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  product?: Product;
}

export function ProductForm({ product }: ProductFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: product ? {
        ...product,
        originalPrice: product.originalPrice || 0,
        imageUrl: product.imageUrl || ''
    } : {
      name_en: '',
      name_hi: '',
      description_en: '',
      description_hi: '',
      price: 0,
      originalPrice: 0,
      imageUrl: '',
      imageHint: '',
      category: 'Pooja Items',
      shopId: 'shop_123',
    },
  });

  const title = product ? `Edit ${product.name_en}` : 'Add a New Product';
  const description = product ? 'Update the details for this product.' : 'Fill out the form to add a new product to the marketplace.';

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const imageFile = data.imageFile;
      const productId = product ? product.id : doc(collection(db, 'products')).id;
      
      const placeholderImageUrl = `https://picsum.photos/seed/${productId}/600`;

      const fullData: Product = {
        id: productId,
        name_en: data.name_en,
        name_hi: data.name_hi,
        description_en: data.description_en,
        description_hi: data.description_hi,
        price: data.price,
        originalPrice: data.originalPrice || data.price,
        imageUrl: product?.imageUrl || placeholderImageUrl,
        imageHint: data.imageHint,
        category: data.category,
        shopId: data.shopId,
      };

      try {
        const productRef = doc(db, 'products', productId);
        await setDoc(productRef, fullData, { merge: true });
        
        toast({ 
          title: product ? 'Product Updated!' : 'Product Created!', 
          description: `${data.name_en} has been saved.` 
        });

        router.push('/admin/content?tab=products');

        if (imageFile) {
            toast({ title: "Uploading Image...", description: "This will happen in the background." });
            const storageRef = ref(storage, `product-images/${Date.now()}_${imageFile.name}`);
            uploadBytes(storageRef, imageFile).then(snapshot => {
                getDownloadURL(snapshot.ref).then(finalImageUrl => {
                    updateDoc(productRef, { imageUrl: finalImageUrl });
                });
            });
        }
      } catch (serverError) {
          console.error("Error saving product:", serverError);
          const permissionError = new FirestorePermissionError({
            path: `products/${productId}`,
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
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name_en" render={({ field }) => (
                <FormItem><FormLabel>Name (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="name_hi" render={({ field }) => (
                <FormItem><FormLabel>Name (Hindi)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description_en" render={({ field }) => (
              <FormItem><FormLabel>Description (English)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="description_hi" render={({ field }) => (
              <FormItem><FormLabel>Description (Hindi)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="originalPrice" render={({ field }) => (
                <FormItem><FormLabel>Original Price (Optional)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            
             <FormField control={form.control} name="imageFile" render={({ field }) => (
                <FormItem>
                    <FormLabel>Product Image</FormLabel>
                    <FormControl>
                        <ImageUpload 
                            onFileSelect={(file) => form.setValue('imageFile', file)}
                            initialUrl={form.getValues('imageUrl')}
                            folderName="product-images"
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
             )} />
            
            <FormField control={form.control} name="imageHint" render={({ field }) => (
                <FormItem>
                    <FormLabel>Image Hint</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormDescription>e.g. `product image` for AI image search.</FormDescription>
                    <FormMessage />
                </FormItem>
             )} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="shopId" render={({ field }) => (
                    <FormItem><FormLabel>Shop ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {product ? 'Save Changes' : 'Create Product'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
