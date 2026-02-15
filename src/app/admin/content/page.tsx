

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, PlusCircle, Trash2, Edit, Sparkles, BookOpen, UserSquare, Palmtree, Trophy, ShoppingCart, Shield } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { isSuperAdmin } from '@/lib/admin';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useFirestore } from '@/lib/firebase/provider';
import { collection, deleteDoc, doc, FirestoreDataConverter, query, where, orderBy } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import type { Deity } from '@/lib/deities';
import type { Story } from '@/lib/stories';
import type { EpicHero } from '@/lib/characters';
import type { Temple } from '@/lib/temples';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { productConverter, type Product } from '@/lib/products';
import { Challenge, challengeConverter } from '@/lib/challenges';


const deityConverter: FirestoreDataConverter<Deity> = {
    toFirestore: (deity: Deity) => deity,
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return { id: snapshot.id, ...data } as Deity;
    }
};
const storyConverter: FirestoreDataConverter<Story> = {
    toFirestore: (story: Story) => story,
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return { id: snapshot.id, ...data } as Story;
    }
};
const epicHeroConverter: FirestoreDataConverter<EpicHero> = {
    toFirestore: (hero: EpicHero) => hero,
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return { id: snapshot.id, ...data } as EpicHero;
    }
};

const templeConverter: FirestoreDataConverter<Temple> = {
    toFirestore: (temple: Temple) => temple,
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return { id: snapshot.id, ...data } as Temple;
    }
};


function DeitiesTabContent() {
  const db = useFirestore();
  const deitiesQuery = useMemo(() => db ? query(collection(db, 'deities').withConverter(deityConverter)) : null, [db]);
  const [snapshot, isLoading, error] = useCollection(deitiesQuery);
  const { toast } = useToast();
  const { language } = useLanguage();
  
  useEffect(() => {
    if (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'deities', operation: 'list'}));
    }
  }, [error]);

  const deities = useMemo(() => snapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [snapshot]);


  const handleDelete = async (id: string) => {
    if (!db) return;
    const docRef = doc(db, 'deities', id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: 'Deity Deleted', description: 'The deity has been removed from the database.' });
      })
      .catch((error) => {
         const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">Manage the gods and goddesses in the app.</p>
        <Button asChild>
          <Link href="/admin/deities/new">
            <PlusCircle className="mr-2" />
            Add New Deity
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deities?.map((deity) => {
            const imageUrl = deity.images?.[0]?.url;
            const imageHint = deity.images?.[0]?.hint;
            return (
              <Card key={deity.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{deity.name?.[language] || deity.name?.en || 'Unnamed Deity'}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/deities/edit/${deity.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to delete {deity.name?.en || 'this deity'}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the deity.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(deity.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-video rounded-md overflow-hidden bg-secondary">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={deity.name?.en || 'Deity image'}
                        data-ai-hint={imageHint}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StoriesTabContent() {
  const db = useFirestore();
  const storiesQuery = useMemo(() => db ? query(collection(db, 'stories').withConverter(storyConverter)) : null, [db]);
  const [snapshot, isLoading, error] = useCollection(storiesQuery);
  const { toast } = useToast();
  const { language } = useLanguage();
  
  useEffect(() => {
    if (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'stories', operation: 'list'}));
    }
  }, [error]);

  const stories = useMemo(() => snapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [snapshot]);

  const handleDelete = async (id: string) => {
    if (!db) return;
    const docRef = doc(db, 'stories', id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: 'Story Deleted', description: 'The story has been removed.' });
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">Manage the episodic stories in the app.</p>
        <Button asChild>
          <Link href="/admin/stories/new">
            <PlusCircle className="mr-2" />
            Add New Story
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories?.map((story) => {
            const imageUrl = story.image?.url;
            const imageHint = story.image?.hint;
            return (
              <Card key={story.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{story.title?.[language] || story.title?.en || 'Untitled Saga'}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/stories/edit/${story.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to delete this story?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the story.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(story.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-video rounded-md overflow-hidden bg-secondary">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={story.title?.en || 'Story Image'}
                        data-ai-hint={imageHint}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CharactersTabContent() {
  const db = useFirestore();
  const charactersQuery = useMemo(() => db ? query(collection(db, 'epicHeroes').withConverter(epicHeroConverter)) : null, [db]);
  const [snapshot, isLoading, error] = useCollection(charactersQuery);
  const { toast } = useToast();
  const { language } = useLanguage();
  
  useEffect(() => {
    if (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'epicHeroes', operation: 'list'}));
    }
  }, [error]);

  const characters = useMemo(() => snapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [snapshot]);

  const handleDelete = async (id: string) => {
    if (!db) return;
    const docRef = doc(db, 'epicHeroes', id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: 'Character Deleted', description: 'The character has been removed.' });
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">Manage the mythological characters in the app.</p>
        <Button asChild>
          <Link href="/admin/characters/new">
            <PlusCircle className="mr-2" />
            Add New Character
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters?.map((character) => {
            const imageUrl = character.imageUrl;
            const imageHint = character.imageHint;
            return (
              <Card key={character.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{character.name?.[language] || character.name?.en || 'Unnamed Hero'}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/characters/edit/${character.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to delete this character?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the character.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(character.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-video rounded-md overflow-hidden bg-secondary">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={character.name?.en || 'Character Image'}
                        data-ai-hint={imageHint}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TemplesTabContent() {
  const db = useFirestore();
  const templesQuery = useMemo(() => db ? query(collection(db, 'temples').withConverter(templeConverter)) : null, [db]);
  const [snapshot, isLoading, error] = useCollection(templesQuery);
  const { toast } = useToast();
  const { language } = useLanguage();
  
  useEffect(() => {
    if (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'temples', operation: 'list'}));
    }
  }, [error]);

  const temples = useMemo(() => snapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [snapshot]);

  const handleDelete = async (id: string) => {
    if (!db) return;
    const docRef = doc(db, 'temples', id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: 'Temple Deleted', description: 'The temple has been removed.' });
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">Manage the temples and pilgrimage sites.</p>
        <Button asChild>
          <Link href="/admin/temples/new">
            <PlusCircle className="mr-2" />
            Add New Temple
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {temples?.map((temple) => {
            const imageUrl = temple.media?.images?.[0]?.url;
            const imageHint = temple.media?.images?.[0]?.hint;
            return (
              <Card key={temple.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{temple.name?.[language] || temple.name?.en || 'Unnamed Temple'}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/temples/edit/${temple.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to delete this temple?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the temple data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(temple.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-video rounded-md overflow-hidden bg-secondary">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={temple.name?.en || 'Temple Image'}
                        data-ai-hint={imageHint}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContestsTabContent() {
  const db = useFirestore();
  const { toast } = useToast();
  const contestsRef = useMemo(() => db ? collection(db, 'contests') : null, [db]);
  const [snapshot, isLoading] = useCollection(contestsRef);
  const contests = useMemo(() => snapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [snapshot]);

  const handleDelete = (id: string) => {
    if (!db) return;
    const contestDocRef = doc(db, 'contests', id);
    deleteDoc(contestDocRef)
      .then(() => {
        toast({ title: 'Contest Deleted', description: 'The contest has been removed.' });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: contestDocRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">Manage global chanting contests.</p>
        <Button asChild>
          <Link href="/admin/contests/new">
            <PlusCircle className="mr-2" />
            Create New Contest
          </Link>
        </Button>
      </div>
      <div className="space-y-4">
        {contests?.map((contest) => (
          <Card key={contest.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{contest.title}</CardTitle>
                  <CardDescription>Goal: {Number(contest.goal).toLocaleString()} chants</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                   <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/contests/edit/${contest.id}`}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" />Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete the contest.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(contest.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Badge variant={contest.status === 'active' ? 'default' : 'secondary'}>{contest.status}</Badge>
                <span>Total: {Number(contest.totalChants || 0).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ProductsTabContent() {
    const db = useFirestore();
    const { toast } = useToast();
    
    const productsQuery = useMemo(() => db ? query(collection(db, 'products').withConverter(productConverter)) : undefined, [db]);
    const [productsSnapshot, isLoading, error] = useCollection(productsQuery);
    
    useEffect(() => {
        if(error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({path: 'products', operation: 'list'}));
        }
    }, [error]);
    
    const products = useMemo(() => productsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [productsSnapshot]);

    const handleDelete = (id: string) => {
        if (!db) return;
        const productDocRef = doc(db, 'products', id);

        deleteDoc(productDocRef)
            .then(() => {
                toast({ title: 'Product Deleted', description: 'The product has been removed.' });
            })
            .catch((err) => {
                const permissionError = new FirestorePermissionError({
                    path: productDocRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    return (
        <div>
        <div className="flex justify-between items-center mb-6">
            <p className="text-muted-foreground">Manage the items in your marketplace.</p>
            <Button asChild>
            <Link href="/admin/products/new">
                <PlusCircle className="mr-2" />
                Add New Product
            </Link>
            </Button>
        </div>
        {isLoading ? (
            <div className="flex justify-center items-center h-64">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products?.map((product) => (
                <Card key={product.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{product.name_en}</CardTitle>
                    <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/products/edit/${product.id}`}>
                        <Edit className="h-4 w-4" />
                        </Link>
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete the product.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(product.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative aspect-square rounded-md overflow-hidden bg-secondary">
                    <Image
                        src={product.imageUrl}
                        alt={product.name_en}
                        data-ai-hint={product.imageHint || 'product image'}
                        fill
                        className="object-cover"
                    />
                    </div>
                    <p className="mt-2 font-bold text-lg text-primary">₹{product.price.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                </CardContent>
                </Card>
            ))}
            </div>
        )}
        </div>
    );
}

function ChallengesTabContent() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const challengesQuery = useMemo(() => db ? query(collection(db, 'challenges').withConverter(challengeConverter)) : null, [db]);
  const [snapshot, isLoading, error] = useCollection(challengesQuery);

  useEffect(() => {
    if (error) {
        const permissionError = new FirestorePermissionError({
            path: challengesQuery?.path || 'challenges',
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  }, [error, challengesQuery]);
  
  const challenges = useMemo(() => snapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [snapshot]);

  const handleDelete = (id: string) => {
    if (!db) return;
    const challengeDocRef = doc(db, 'challenges', id);
    deleteDoc(challengeDocRef)
      .then(() => {
        toast({ title: 'Challenge Deleted', description: 'The challenge has been removed.' });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: challengeDocRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">Create and manage community challenges.</p>
        <Button asChild>
          <Link href="/admin/challenges/new">
            <PlusCircle className="mr-2" />
            Create New Challenge
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map((challenge) => (
            <Card key={challenge.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{challenge.title_en}</CardTitle>
                    <CardDescription>{challenge.durationDays} day challenge</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/challenges/edit/${challenge.id}`}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone. This will permanently delete the challenge.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(challenge.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">Badge: {challenge.badgeId}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


export default function ContentManagementPage() {
  const auth = useAuth();
  const [user, loadingAuth] = useAuthState(auth);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const superAdmin = isSuperAdmin(user);

  if (!isClient || loadingAuth) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16 flex justify-center items-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <div className="text-center py-16">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You must be logged in to access this page.</p>
        </div>
      </main>
    );
  }

  if (!superAdmin) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <div className="text-center py-16">
          <Shield className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-2">You do not have permission to access this page.</p>
          <p className="text-sm text-muted-foreground">Only super administrators can access this page.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
      <div className="text-left mb-8">
        <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary flex items-center gap-3">
          Content Management
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Add, edit, and manage all the core content of the Aaura application.
        </p>
      </div>

      <Tabs defaultValue="deities" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="deities"><Sparkles className="mr-2 h-4 w-4" />Deities</TabsTrigger>
          <TabsTrigger value="stories"><BookOpen className="mr-2 h-4 w-4" />Epic Sagas</TabsTrigger>
          <TabsTrigger value="characters"><UserSquare className="mr-2 h-4 w-4" />Epic Heroes</TabsTrigger>
          <TabsTrigger value="temples"><Palmtree className="mr-2 h-4 w-4" />Temples</TabsTrigger>
          <TabsTrigger value="products"><ShoppingCart className="mr-2 h-4 w-4" />Products</TabsTrigger>
          <TabsTrigger value="contests"><Trophy className="mr-2 h-4 w-4" />Contests</TabsTrigger>
          <TabsTrigger value="challenges"><Shield className="mr-2 h-4 w-4" />Challenges</TabsTrigger>
        </TabsList>
        <TabsContent value="deities" className="mt-6"><DeitiesTabContent /></TabsContent>
        <TabsContent value="stories" className="mt-6"><StoriesTabContent /></TabsContent>
        <TabsContent value="characters" className="mt-6"><CharactersTabContent /></TabsContent>
        <TabsContent value="temples" className="mt-6"><TemplesTabContent /></TabsContent>
        <TabsContent value="products" className="mt-6"><ProductsTabContent /></TabsContent>
        <TabsContent value="contests" className="mt-6"><ContestsTabContent /></TabsContent>
        <TabsContent value="challenges" className="mt-6"><ChallengesTabContent /></TabsContent>
      </Tabs>
    </main>
  );
}
