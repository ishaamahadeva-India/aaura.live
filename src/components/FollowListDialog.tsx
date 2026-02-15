

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useFirestore } from '@/lib/firebase/provider';
import { collection, doc, query } from 'firebase/firestore';
import { useCollectionData, useDocumentData } from 'react-firebase-hooks/firestore';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Loader2, User } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';

function UserRow({ userId }: { userId: string }) {
    const db = useFirestore();
    const userRef = doc(db, 'users', userId);
    const [userData, loading] = useDocumentData(userRef);

    if (loading) {
        return (
            <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[150px]" />
                </div>
            </div>
        );
    }
    
    if (!userData) return null;

    return (
        <Link href={`/profile/${userId}`} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary">
            <Avatar>
                <AvatarImage src={userData.photoURL} />
                <AvatarFallback>{userData.fullName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <p className="font-semibold">{userData.fullName}</p>
        </Link>
    )
}


interface FollowListDialogProps {
  userId: string;
  type: 'followers' | 'following';
  trigger: React.ReactNode;
}

export function FollowListDialog({ userId, type, trigger }: FollowListDialogProps) {
  const db = useFirestore();
  const listQuery = query(collection(db, `users/${userId}/${type}`));
  const [list, loading] = useCollectionData(listQuery);

  const title = type === 'followers' ? 'Followers' : 'Following';

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-72 w-full rounded-md border">
            <div className="p-4 space-y-4">
            {loading && (
                 <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin" />
                 </div>
            )}
            {!loading && list && list.length > 0 ? (
                list.map(item => <UserRow key={item.userId} userId={item.userId} />)
            ) : !loading && (
                <div className="text-center text-muted-foreground p-8">
                     <User className="mx-auto h-12 w-12 opacity-50" />
                    <p className="mt-4">No {type} found.</p>
                </div>
            )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
