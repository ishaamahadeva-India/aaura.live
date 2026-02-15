'use client';

import { useState } from "react";
import { useAuth, useFirebase, useFirestore, useStorage } from "@/lib/firebase/provider";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuthState } from "react-firebase-hooks/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flower } from "lucide-react";

type FlowerProps = { id: string; left: number; animationDuration: number };

export default function UploadReel() {
  const auth = useAuth();
  const { app } = useFirebase();
  const db = useFirestore();
  const storage = useStorage();
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [floatingFlowers, setFloatingFlowers] = useState<FlowerProps[]>([]);

  // Floating flower effect for uploads
  const spawnFloatingFlowers = () => {
    const newFlowers: FlowerProps[] = Array.from({ length: 5 }).map((_, i) => ({
      id: `${Date.now()}-${i}`,
      left: Math.random() * 80 + 10, // percentage from left
      animationDuration: 800 + Math.random() * 400, // ms
    }));
    setFloatingFlowers((prev) => [...prev, ...newFlowers]);
    setTimeout(() => {
      setFloatingFlowers((prev) => prev.slice(newFlowers.length));
    }, 1200);
  };

  const handleUpload = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Please login to upload" });
      return;
    }
    if (!videoFile) {
      toast({ variant: "destructive", title: "Please select a video" });
      return;
    }

    // Enforce sane size limits for reels to avoid failed uploads and high costs
    const MAX_VIDEO_SIZE = 1 * 1024 * 1024 * 1024; // 1GB hard limit
    const LARGE_VIDEO_WARNING_SIZE = 500 * 1024 * 1024; // 500MB warning

    if (videoFile.size > MAX_VIDEO_SIZE) {
      const fileSizeGB = (videoFile.size / (1024 * 1024 * 1024)).toFixed(2);
      toast({
        variant: "destructive",
        title: "File too large",
        description: `Video must be less than 1GB. Your file is ${fileSizeGB}GB. Please compress or trim your video before uploading.`,
      });
      return;
    }

    if (videoFile.size > LARGE_VIDEO_WARNING_SIZE) {
      const fileSizeMB = (videoFile.size / (1024 * 1024)).toFixed(0);
      const estimatedMinutes = Math.max(
        1,
        Math.round((videoFile.size * 8) / (5 * 1024 * 1024 * 1024) * 60) // Estimate at ~5 Mbps
      );
      toast({
        title: "Large file detected",
        description: `File size: ~${fileSizeMB}MB. Estimated upload time: ~${estimatedMinutes} minutes on an average connection. Please keep this page open and avoid closing the browser.`,
        duration: 8000,
      });
    }

    setUploading(true);

    try {
      if (!storage) {
        throw new Error('Storage not available');
      }

      // Use default Firebase Storage (avoids billing and CORS issues)
      // Sanitize filename to avoid special character issues
      const sanitizedFileName = videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `media/${user.uid}/${Date.now()}-${sanitizedFileName}`;
      const storageRef = ref(storage, storagePath);
      // Infer content type from file extension if not provided
      let contentType = videoFile.type;
      if (!contentType) {
        const ext = videoFile.name.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
          'mp4': 'video/mp4',
          'mov': 'video/quicktime',
          'avi': 'video/x-msvideo',
          'webm': 'video/webm',
        };
        contentType = ext ? mimeTypes[ext] || 'video/mp4' : 'video/mp4';
      }
      const uploadTask = uploadBytesResumable(storageRef, videoFile, {
        contentType: contentType,
      });
      
      // Wait for upload to complete
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Progress tracking can be added here if needed
          },
          (error) => reject(error),
          async () => {
            resolve();
          }
        );
      });

      // Get download URL after upload
      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, "media"), {
        userId: user.uid,
        mediaUrl: downloadURL,
        mediaStorageBucket: "studio-9632556640-bd58d.firebasestorage.app", // Default Firebase bucket
        mediaStoragePath: storagePath,
        // Back-compat for existing processing code paths
        videoStoragePath: storagePath,
        caption,
        likes: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
      });

      // Spawn flowers on successful upload
      spawnFloatingFlowers();

      toast({ title: "Reel uploaded successfully!" });
      setVideoFile(null);
      setCaption("");
    } catch (err: any) {
      console.error(err);
      toast({ 
        variant: "destructive", 
        title: "Upload error",
        description: err.message || "Failed to upload video"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-3 p-4 border rounded-lg bg-background">
      <Input
        type="file"
        accept="video/*"
        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
      />
      <Input
        type="text"
        placeholder="Add a caption..."
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />
      <Button onClick={handleUpload} disabled={uploading}>
        {uploading ? "Uploading..." : "Upload Reel"}
      </Button>

      {/* Floating flowers */}
      {floatingFlowers.map((f) => (
        <Flower
          key={f.id}
          className="absolute text-pink-400 drop-shadow-mystic"
          style={{
            left: `${f.left}%`,
            bottom: "20%",
            width: "25px",
            height: "25px",
            animation: `flower-float ${f.animationDuration}ms ease-out forwards`,
          }}
        />
      ))}
    </div>
  );
}
