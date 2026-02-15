
'use client';

import { useCollection, useCollectionData } from 'react-firebase-hooks/firestore';
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  DocumentData,
  DocumentReference,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { isAdminUser } from '@/lib/admin';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Sparkles,
  BookOpen,
  UserSquare,
  Palmtree,
  Film,
  Building2,
  Wrench,
  CalendarClock,
  MapPin,
  IndianRupee,
  Paperclip,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransition, useMemo } from 'react';

type ContentType = 'stories' | 'deities' | 'temples' | 'epicHeroes' | 'rituals' | 'festivals';
type RequestType = 'temple_renovation_requests' | 'temple_maintenance_funds';

interface ReviewItem extends DocumentData {
  id: string;
  title?: string;
  name?: { en: string };
  title_en?: string;
  description_en?: string;
  summary?: { en: string };
  mediaType?: string;
}

interface RenovationRequestItem extends DocumentData {
  id: string;
  templeName?: string;
  location?: string;
  description?: string;
  totalGoal?: number;
  progressStatus?: string;
  imageUrl?: string;
  videoUrl?: string;
  createdBy?: string;
  createdAt?: any;
  status?: string;
  ref?: DocumentReference;
}

const formatCurrency = (value?: number) => {
  if (typeof value !== 'number') return '—';
  return `₹${value.toLocaleString('en-IN')}`;
};

const formatTimestamp = (timestamp?: any) => {
  if (!timestamp) return 'Not available';
  try {
    const date =
      typeof timestamp?.toDate === 'function'
        ? timestamp.toDate()
        : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return date.toLocaleString();
  } catch (error) {
    console.warn('Failed to format timestamp', error);
    return 'Not available';
  }
};

function ReviewCard({ item, collectionName }: { item: ReviewItem, collectionName: ContentType }) {
  const { toast } = useToast();
  const db = useFirestore();
  const [isPending, startTransition] = useTransition();

  const handleUpdateStatus = (status: 'published' | 'rejected') => {
    startTransition(async () => {
        if (!db) return;
        try {
            const itemRef = doc(db, collectionName, item.id);
            await updateDoc(itemRef, { 
              status: status,
              updatedAt: serverTimestamp(),
              reviewedAt: serverTimestamp(),
            });
            toast({
                title: `Content ${status === 'published' ? 'Approved' : 'Rejected'}`,
                description: `The item has been successfully ${status === 'published' ? 'approved and published' : 'rejected'}.`,
            });
        } catch (error) {
            console.error(`Failed to update status:`, error);
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: `Could not update the item's status.`,
            });
        }
    });
  };

  const title = item.title_en || item.title?.en || item.name?.en || 'No Title';
  const description = item.description_en || item.summary?.en || `Type: ${collectionName}`;
  const badgeText = item.mediaType || collectionName.replace(/([A-Z])/g, ' $1').slice(0, -1);


  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="line-clamp-2">{title}</CardTitle>
        <CardDescription>
          <Badge variant="secondary">{badgeText}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-4">{description}</p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="destructive" size="sm" onClick={() => handleUpdateStatus('rejected')} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4" />}
          Reject
        </Button>
        <Button size="sm" onClick={() => handleUpdateStatus('published')} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />}
          Approve
        </Button>
      </CardFooter>
    </Card>
  );
}

function RenovationRequestCard({ item }: { item: RenovationRequestItem }) {
  const { toast } = useToast();
  const db = useFirestore();
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const [isPending, startTransition] = useTransition();

  const handleUpdateStatus = (status: 'approved' | 'rejected') => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'You must be logged in to approve/reject requests.',
      });
      return;
    }

    if (!isAdminUser(user)) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Only authorized admins can approve or reject requests.',
      });
      return;
    }

    const requestId =
      typeof item.id === 'string'
        ? item.id
        : typeof item.id === 'number'
          ? item.id.toString()
          : undefined;

    if (!requestId) {
      toast({
        variant: 'destructive',
        title: 'Missing Request ID',
        description: 'This request is missing an identifier and cannot be processed. Please refresh and try again.',
      });
      console.error('Renovation request is missing id:', item);
      return;
    }

    startTransition(async () => {
        if (!db || !user) return;
        try {
            // Refresh auth token before update
            try {
              await user.getIdToken(true);
            } catch (tokenError) {
              console.warn('Failed to refresh auth token before update', tokenError);
            }

            const fallbackPath = `temple_renovation_requests/${requestId}`;
            const targetPath = item.ref?.path ?? fallbackPath;

            if (!targetPath) {
              throw new Error(`Cannot determine document path for renovation request. Item: ${JSON.stringify({
                id: item.id,
                refPath: item.ref?.path,
              })}`);
            }

            const pathSegments = targetPath.split('/').filter(Boolean);
            if (pathSegments.length % 2 !== 0) {
              throw new Error(`Invalid document path for renovation request: ${targetPath}`);
            }

            const targetRef = doc(db, ...pathSegments);
            console.info('Updating renovation request status', {
              requestId,
              status,
              user: user.uid,
              targetPath,
              pathSegments,
              hasRef: Boolean(item.ref),
            });
            await updateDoc(targetRef, { 
              status: status,
              updatedAt: serverTimestamp(),
              reviewedAt: serverTimestamp(),
            });
            toast({
                title: `Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
                description: `The renovation request has been successfully ${status === 'approved' ? 'approved' : 'rejected'}.`,
            });
        } catch (error: any) {
            console.error(`Failed to update status:`, error);
            const errorCode = error?.code || 'unknown';
            const errorMessage = error?.message || 'Unknown error';
            console.error('Error code:', errorCode);
            console.error('Error message:', errorMessage);
            console.error('User UID:', user?.uid);
            console.error('Is Admin User:', isAdminUser(user));
            
            let userMessage = `Could not update the request's status.`;
            if (errorCode === 'permission-denied') {
                userMessage = 'Permission denied. You must be an authorized admin to approve or reject requests. Please ensure you are logged in with the correct account.';
            } else if (errorMessage) {
                userMessage = `${userMessage} Error: ${errorMessage}`;
            }
            
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: userMessage,
            });
        }
    });
  };

  const statusVariant =
    item.status === 'approved'
      ? 'default'
      : item.status === 'rejected'
        ? 'destructive'
        : 'secondary';

  const attachments = [
    item.imageUrl ? { label: 'View Image Proof', url: item.imageUrl } : null,
    item.videoUrl ? { label: 'View Video Proof', url: item.videoUrl } : null,
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="line-clamp-2">{item.templeName || 'Unnamed Temple'}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {item.location || 'Location not specified'}
            </CardDescription>
          </div>
          <Badge variant={statusVariant} className="capitalize">
            {item.status || 'pending'}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">
              {formatCurrency(item.totalGoal)}
            </span>
          </div>
          {item.progressStatus && (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <Wrench className="h-4 w-4 text-primary" />
              <span className="font-medium capitalize">{item.progressStatus}</span>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <span>{formatTimestamp(item.createdAt)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-xl bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            {item.description || 'No description provided.'}
          </p>
        </div>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <Button key={attachment.label} variant="secondary" size="sm" asChild>
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <Paperclip className="h-4 w-4" />
                  {attachment.label}
                </a>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          Submitted by {item.createdBy || 'Unknown'} • {formatTimestamp(item.createdAt)}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="destructive"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => handleUpdateStatus('rejected')}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Reject
          </Button>
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => handleUpdateStatus('approved')}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Approve
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}


function ReviewTabContent({ collectionName, icon: Icon }: { collectionName: ContentType, icon: React.ElementType }) {
    const db = useFirestore();
    const pendingQuery = useMemo(() => {
        if (!db) return undefined;
        return query(collection(db, collectionName), where('status', '==', 'pending'))
    }, [db, collectionName]);

    const [pendingItems, isLoading] = useCollectionData(pendingQuery, { idField: 'id' });

    return (
        <div>
        {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        ) : pendingItems && pendingItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 2xl:gap-8">
            {(pendingItems as ReviewItem[]).map((item) => (
                <ReviewCard key={item.id} item={item} collectionName={collectionName} />
            ))}
            </div>
        ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Icon className="mx-auto h-24 w-24 text-muted-foreground/50" />
            <h2 className="mt-6 text-2xl font-semibold text-foreground">No Pending Content</h2>
            <p className="mt-2 text-muted-foreground">There are no pending items in this category.</p>
            </div>
        )}
        </div>
    )
}

function RenovationRequestsTabContent() {
    const db = useFirestore();
    const pendingQuery = useMemo(() => {
        if (!db) return undefined;
        return query(collection(db, 'temple_renovation_requests'), where('status', '==', 'pending'))
    }, [db]);

    const [pendingSnapshot, isLoading] = useCollection(pendingQuery);
    const pendingRequests = pendingSnapshot?.docs.map((doc) => {
        const data = doc.data() as RenovationRequestItem;
        return {
            ...data,
            id: doc.id,
            ref: doc.ref,
        };
    }) as RenovationRequestItem[] | undefined;

    return (
        <div>
        {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        ) : pendingRequests && pendingRequests.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 2xl:gap-8">
            {(pendingRequests as RenovationRequestItem[]).map((item) => (
                <RenovationRequestCard key={item.id} item={item} />
            ))}
            </div>
        ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Building2 className="mx-auto h-24 w-24 text-muted-foreground/50" />
            <h2 className="mt-6 text-2xl font-semibold text-foreground">No Pending Requests</h2>
            <p className="mt-2 text-muted-foreground">There are no pending temple renovation requests.</p>
            </div>
        )}
        </div>
    )
}


export default function AdminReviewPage() {
  const { t } = useLanguage();

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary">
          {t.admin.reviewTitle}
        </h1>
        <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
          {t.admin.reviewDescription}
        </p>
      </div>

      <Tabs defaultValue="sagas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="sagas"><BookOpen className="mr-2 h-4 w-4" />Sagas</TabsTrigger>
            <TabsTrigger value="deities"><Sparkles className="mr-2 h-4 w-4" />Deities</TabsTrigger>
            <TabsTrigger value="heroes"><UserSquare className="mr-2 h-4 w-4" />Heroes</TabsTrigger>
            <TabsTrigger value="temples"><Palmtree className="mr-2 h-4 w-4" />Temples</TabsTrigger>
            <TabsTrigger value="rituals"><Film className="mr-2 h-4 w-4" />Rituals</TabsTrigger>
            <TabsTrigger value="festivals"><Sparkles className="mr-2 h-4 w-4" />Festivals</TabsTrigger>
            <TabsTrigger value="renovations"><Building2 className="mr-2 h-4 w-4" />Renovations</TabsTrigger>
            <TabsTrigger value="maintenance"><Wrench className="mr-2 h-4 w-4" />Maintenance</TabsTrigger>
        </TabsList>
        <TabsContent value="sagas" className="mt-6">
            <ReviewTabContent collectionName="stories" icon={BookOpen} />
        </TabsContent>
        <TabsContent value="deities" className="mt-6">
            <ReviewTabContent collectionName="deities" icon={Sparkles} />
        </TabsContent>
         <TabsContent value="heroes" className="mt-6">
            <ReviewTabContent collectionName="epicHeroes" icon={UserSquare} />
        </TabsContent>
         <TabsContent value="temples" className="mt-6">
            <ReviewTabContent collectionName="temples" icon={Palmtree} />
        </TabsContent>
        <TabsContent value="rituals" className="mt-6">
            <ReviewTabContent collectionName="rituals" icon={Film} />
        </TabsContent>
        <TabsContent value="festivals" className="mt-6">
            <ReviewTabContent collectionName="festivals" icon={Sparkles} />
        </TabsContent>
        <TabsContent value="renovations" className="mt-6">
            <RenovationRequestsTabContent />
        </TabsContent>
        <TabsContent value="maintenance" className="mt-6">
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <Wrench className="mx-auto h-24 w-24 text-muted-foreground/50" />
              <h2 className="mt-6 text-2xl font-semibold text-foreground">Maintenance Funds</h2>
              <p className="mt-2 text-muted-foreground">Maintenance funds are created and active immediately. No approval needed.</p>
            </div>
        </TabsContent>
      </Tabs>
      
    </main>
  );
}
