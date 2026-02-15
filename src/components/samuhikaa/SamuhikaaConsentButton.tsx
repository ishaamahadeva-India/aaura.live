'use client';

import { useState, useTransition, useEffect } from 'react';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { SamuhikaaEvent } from '@/hooks/use-samuhikaa-event-status';

interface SamuhikaaConsentButtonProps {
  event: SamuhikaaEvent;
  onConsentChange?: () => void;
}

export function SamuhikaaConsentButton({ event, onConsentChange }: SamuhikaaConsentButtonProps) {
  const auth = useAuth();
  const db = useFirestore();
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [hasConsented, setHasConsented] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isConsenting, startConsentTransition] = useTransition();

  // Check if user has already consented
  useEffect(() => {
    if (!user || !db || !event.id) {
      setIsChecking(false);
      return;
    }

    const checkConsent = async () => {
      try {
        const participantRef = doc(db, `samuhikaa_events/${event.id}/participants/${user.uid}`);
        const participantSnap = await getDoc(participantRef);
        setHasConsented(participantSnap.exists());
      } catch (error) {
        console.error('Error checking consent:', error);
        setHasConsented(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkConsent();
  }, [user, db, event.id]);

  const handleConsent = () => {
    if (!user || !db || !event.id) {
      toast({
        variant: 'destructive',
        title: 'Authentication required',
        description: 'Please log in to participate in Samuhikaa.',
      });
      return;
    }

    startConsentTransition(async () => {
      try {
        const participantRef = doc(db, `samuhikaa_events/${event.id}/participants/${user.uid}`);
        
        // Check if already exists (idempotent)
        const existing = await getDoc(participantRef);
        if (existing.exists()) {
          toast({
            title: 'Already participating',
            description: 'You have already consented to this Samuhikaa event.',
          });
          setHasConsented(true);
          return;
        }

        // Create participant document
        await setDoc(participantRef, {
          userId: user.uid,
          consentedAt: serverTimestamp(),
        });

        setHasConsented(true);
        toast({
          title: 'Consent recorded 🙏',
          description: 'Your participation in this Samuhikaa has been registered.',
        });
        
        onConsentChange?.();
      } catch (error: any) {
        console.error('Error recording consent:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to record consent',
          description: error.message || 'Please try again.',
        });
      }
    });
  };

  if (isChecking) {
    return (
      <Button disabled className="w-full">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (hasConsented) {
    return (
      <Button disabled className="w-full bg-green-600/20 text-green-700 dark:text-green-400 border border-green-600/30">
        ✓ You are participating
      </Button>
    );
  }

  return (
    <Button
      onClick={handleConsent}
      disabled={isConsenting}
      className="w-full bg-primary hover:bg-primary/90"
    >
      {isConsenting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Recording consent...
        </>
      ) : (
        <>
          I Will Participate 🙏
        </>
      )}
    </Button>
  );
}

