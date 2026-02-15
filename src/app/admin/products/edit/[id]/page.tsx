
'use client';

import { useParams, useRouter } from 'next/navigation';
import { ProductForm } from '../../ProductForm';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/lib/firebase/provider';
import { productConverter, type Product } from '@/lib/products';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const db = useFirestore();
  const id = params.id as string;

  const productRef = doc(db, 'products', id).withConverter(productConverter);
  const [product, isLoading] = useDocumentData<Product>(productRef);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!isLoading && !product) {
      return (
          <div className="text-center py-16">
              <h2 className="text-2xl font-semibold">Product not found</h2>
              <p className="mt-2 text-muted-foreground">The requested product could not be located.</p>
              <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
          </div>
      )
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Content
        </Button>
        <ProductForm product={product} />
    </main>
  );
}
