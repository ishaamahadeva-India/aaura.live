
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UploadCloud, Trash2 } from 'lucide-react';
import NextImage from 'next/image';

interface ImageUploadProps {
  onFileSelect?: (file: File | null) => void;
  initialUrl?: string | null;
  folderName?: string;
}

export function ImageUpload({ onFileSelect, initialUrl }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl || null);

  useEffect(() => {
    setPreviewUrl(initialUrl || null);
  }, [initialUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (onFileSelect) {
        onFileSelect(selectedFile);
      }
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);

      // Clean up the blob URL when the component unmounts
      return () => URL.revokeObjectURL(objectUrl);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    if(onFileSelect) {
        onFileSelect(null);
    }
  }

  if (previewUrl) {
    const isLocalPreview = previewUrl.startsWith('blob:');
    
    return (
        <div className="relative w-full aspect-video rounded-md overflow-hidden border p-2 bg-secondary/30">
            {isLocalPreview ? (
                // Use a standard `<img>` tag for local blob previews
                <img src={previewUrl} alt="Image preview" className="object-contain w-full h-full rounded-md" />
            ) : (
                // Use Next.js <Image> for optimized remote images
                <NextImage src={previewUrl} alt="Image preview" fill className="object-contain rounded-md" sizes="(max-width: 768px) 100vw, 50vw" />
            )}
            <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 z-10"
            >
                <Trash2 className="h-4 w-4"/>
            </Button>
        </div>
    )
  }

  return (
    <div className="w-full p-4 border-2 border-dashed rounded-lg text-center">
        <div className="flex flex-col items-center gap-2">
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag and drop or click to browse
          </p>
          <Input
            id="file-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
           <Button asChild variant="outline" type="button">
              <label htmlFor="file-upload" className="cursor-pointer">
                Browse Files
              </label>
            </Button>
        </div>
    </div>
  );
}
