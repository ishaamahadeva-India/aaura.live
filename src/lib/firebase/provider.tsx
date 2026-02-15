
'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { getFirebaseClient } from '@/lib/firebase/client';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import type { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { useToast } from '@/hooks/use-toast';

interface FirebaseContextType {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const resources = useMemo(() => getFirebaseClient(), []);

  return (
    <FirebaseContext.Provider value={resources}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirestore() {
  return useFirebase().db;
}

export function useAuth() {
  return useFirebase().auth;
}

export function useStorage() {
    return useFirebase().storage;
}
