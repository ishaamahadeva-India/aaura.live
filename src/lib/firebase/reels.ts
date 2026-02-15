import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "./client";
// No URL validation needed - getDownloadURL returns correct URL

export async function uploadReel(videoFile: File, caption: string) {
  const storage = getFirebaseStorage();
  const db = getFirestore();

  // Storage path
  const storageRef = ref(storage, `reels/${Date.now()}-${videoFile.name}`);

  // Upload file
  await uploadBytes(storageRef, videoFile);

  // Get download URL from Firebase SDK
  const videoUrl = await getDownloadURL(storageRef);

  // Store in Firestore
  const docRef = await addDoc(collection(db, "reels"), {
    videoUrl,
    caption,
    likes: 0,
    createdAt: serverTimestamp(),
  });

  return { id: docRef.id, videoUrl };
}
