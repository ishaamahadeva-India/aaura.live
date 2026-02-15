
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useAuth } from '@/lib/firebase/provider';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const auth = useAuth();
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // If user is logged in, show them the main feed.
        router.replace('/feed');
      } else {
        // If user is not logged in, show them the landing page.
        router.replace('/landing');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
}
