'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, doc, serverTimestamp, addDoc, updateDoc, increment, query, orderBy, DocumentData, WithFieldValue } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, Reply, ChevronDown, ChevronUp, ThumbsUp } from 'lucide-react';
import { FlowerIcon } from '@/components/FlowerIcon';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientOnlyTime } from '@/components/ClientOnlyTime';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { cn, safeStartsWith } from '@/lib/utils';
import Link from 'next/link';

const commentSchema = z.object({
  text: z.string().min(1, "Comment cannot be empty.").max(500, "Comment too long."),
});

type CommentFormValues = z.infer<typeof commentSchema>;

interface CommentsProps {
  contentId: string;
  contentType: 'media' | 'post' | 'temple' | 'festival';
}

export function Comments({ contentId, contentType }: CommentsProps) {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [user, authLoading] = useAuthState(auth);
  const [isPending, startTransition] = useTransition();
  const [optimisticComments, setOptimisticComments] = useState<DocumentData[]>([]);
  const [isClient, setIsClient] = useState(false);

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { text: '' },
  });

  useEffect(() => { setIsClient(true); }, []);

  const commentsCollectionName = useMemo(() => {
    if (!contentType) return '';
    if(contentType === 'media') return 'media';
    if(contentType === 'post') return 'posts';
    if(contentType === 'temple') return 'temples';
    if(contentType === 'festival') return 'festivals';
    // Fallback: try to pluralize, but validate it's not empty
    return contentType ? `${contentType}s` : '';
  }, [contentType]);

  const commentsCollectionPath = useMemo(() => {
    if (!contentId || !commentsCollectionName || contentId.trim() === '' || commentsCollectionName.trim() === '') {
      return '';
    }
    return `${commentsCollectionName}/${contentId}/comments`;
  }, [commentsCollectionName, contentId]);

  const commentsQuery = useMemo(() => {
    if (!db || !commentsCollectionPath) return null;
    return query(collection(db, commentsCollectionPath), orderBy('createdAt', 'desc'));
  }, [db, commentsCollectionPath]);

  const [commentsSnapshot, commentsLoading, commentsError] = useCollectionData(commentsQuery, { idField: 'id' });
  const comments = useMemo(() => commentsSnapshot?.map(docSnap => ({ id: docSnap.id, ...docSnap })) || [], [commentsSnapshot]);

  useEffect(() => { setOptimisticComments([]); }, [contentId]);

  useEffect(() => {
    if (!comments) return;
    const validComments = comments.filter(c => c && c.id && typeof c.id === 'string');
    setOptimisticComments(prev => {
      const realIds = new Set(validComments.map(c => c.id));
      const stillOptimistic = prev.filter(opt => safeStartsWith(opt.id, 'temp-') && !realIds.has(opt.id));
      return [...validComments, ...stillOptimistic];
    });
  }, [comments]);

  const onSubmitComment = (data: CommentFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Log in to comment.' });
      return;
    }
    
    // Validate that we have all required data before proceeding
    if (!db) {
      toast({ variant: 'destructive', title: 'Database not available', description: 'Please refresh the page.' });
      return;
    }
    
    if (!contentId || !commentsCollectionPath || commentsCollectionPath === '') {
      console.error('Cannot create comment: missing contentId or collection path', {
        contentId,
        contentType,
        commentsCollectionName,
        commentsCollectionPath,
      });
      toast({ 
        variant: 'destructive', 
        title: 'Failed to post comment', 
        description: 'Missing required information. Please refresh the page and try again.' 
      });
      return;
    }
    
    startTransition(async () => {
      try {
        const commentsCollectionRef = collection(db, commentsCollectionPath);
        const commentData: WithFieldValue<DocumentData> = {
          contentId,
          contentType,
          authorId: user.uid,
          text: data.text,
          createdAt: serverTimestamp(),
          likes: 0,
          replyCount: 0,
        };

        const tempId = `temp-${Date.now()}`;
        const tempComment = { ...commentData, id: tempId, createdAt: { toDate: () => new Date() } };
        setOptimisticComments(prev => [tempComment, ...prev]);
        form.reset();

        await addDoc(commentsCollectionRef, commentData);
      } catch (err: any) {
        // Remove optimistic comment on error
        setOptimisticComments(prev => prev.filter(c => !safeStartsWith(c.id, 'temp-')));
        
        const permissionError = new FirestorePermissionError({
          path: commentsCollectionPath,
          operation: 'create',
          requestResourceData: { contentId, contentType, text: data.text },
        });
        errorEmitter.emit('permission-error', permissionError);
        
        console.error('Error creating comment:', err);
        toast({ 
          variant: 'destructive', 
          title: 'Failed to post comment', 
          description: err.message || 'Please try again.' 
        });
      }
    });
  };

  return (
    <div className="max-w-4xl">
      {isClient && (
        <>
          {authLoading ? (
            <div className="text-center py-6 text-sm text-muted-foreground">Loading account…</div>
          ) : user ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitComment)} className="flex items-start gap-4 mb-8">
                <Avatar className="h-10 w-10 mt-1">
                  <AvatarImage src={user.photoURL || undefined} />
                  <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <FormField control={form.control} name="text" render={({ field }: any) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <Textarea
                        placeholder="Write a comment..."
                        className="resize-none"
                        rows={1}
                        onFocus={e => e.target.rows = 3}
                        onBlur={e => e.target.rows = 1}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Comment
                </Button>
              </form>
            </Form>
          ) : (
            <div className="text-sm text-center text-muted-foreground bg-secondary/50 p-4 rounded-lg mb-8">
              <Link href="/login" className="text-primary underline font-semibold">Log in</Link> to post a comment.
            </div>
          )}
        </>
      )}

      {/* Comments list */}
      {commentsLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-2">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="w-full space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : optimisticComments.length > 0 ? (
        <div className="space-y-6">
          {optimisticComments.map(comment => (
            <CommentCard key={comment.id} comment={comment} db={db} collectionPath={commentsCollectionPath} user={user} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm text-center py-4">No comments yet.</p>
      )}
    </div>
  );
}

// ---------------- CommentCard ----------------
interface CommentCardProps {
  comment: DocumentData;
  db: any;
  collectionPath: string;
  user: any;
}

function CommentCard({ comment, db, collectionPath, user }: CommentCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [optimisticLikes, setOptimisticLikes] = useState(comment.likes || 0);
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [optimisticReplies, setOptimisticReplies] = useState<DocumentData[]>([]);
  const [isPending, startTransition] = useTransition();

  const commentRef = useMemo(() => doc(db, collectionPath, comment.id), [db, collectionPath, comment.id]);

  // Fetch replies from Firestore
  const repliesCollectionPath = useMemo(() => {
    if (!db || !collectionPath || !comment.id) return null;
    return `${collectionPath}/${comment.id}/replies`;
  }, [db, collectionPath, comment.id]);

  const repliesQuery = useMemo(() => {
    if (!db || !repliesCollectionPath) return null;
    return query(collection(db, repliesCollectionPath), orderBy('createdAt', 'asc'));
  }, [db, repliesCollectionPath]);

  const [repliesSnapshot, repliesLoading] = useCollectionData(repliesQuery, { idField: 'id' });
  const realReplies = useMemo(() => repliesSnapshot?.map(docSnap => ({ id: docSnap.id, ...docSnap })) || [], [repliesSnapshot]);

  // Merge real replies with optimistic replies
  const allReplies = useMemo(() => {
    const realIds = new Set(realReplies.map(r => r.id));
    const stillOptimistic = optimisticReplies.filter(opt => safeStartsWith(opt.id, 'temp-reply-') && !realIds.has(opt.id));
    return [...realReplies, ...stillOptimistic];
  }, [realReplies, optimisticReplies]);

  const handleLike = () => {
    if (!user) return;
    startTransition(() => {
      const liked = isLiked;
      setIsLiked(!liked);
      setOptimisticLikes(prev => liked ? prev - 1 : prev + 1);
      updateDoc(commentRef, { likes: increment(liked ? -1 : 1) }).catch(console.error);
    });
  };

  const replyForm = useForm<CommentFormValues>({ defaultValues: { text: '' } });
  const handleReply = (text: string) => {
    if (!user) return;
    startTransition(async () => {
      const repliesCollection = collection(db, `${collectionPath}/${comment.id}/replies`);
      const replyData = { text, authorId: user.uid, createdAt: serverTimestamp() };
      const tempId = `temp-reply-${Date.now()}`;
      setOptimisticReplies(prev => [...prev, { ...replyData, id: tempId }]);
      replyForm.reset();
      try { await addDoc(repliesCollection, replyData); } catch (err) { console.error(err); }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
        <Avatar className="h-9 w-9">
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">User</p>
            <p className="text-xs text-muted-foreground">
              <ClientOnlyTime date={comment.createdAt?.toDate?.() || new Date()} />
            </p>
          </div>
          <p className="text-sm mt-2 text-foreground/90">{comment.text}</p>

          <div className="flex items-center gap-4 mt-2">
            <Button onClick={handleLike} size="sm" variant="ghost" className="flex items-center gap-1">
              <FlowerIcon size="sm" isLiked={isLiked} />
              {optimisticLikes}
            </Button>
            <Button size="sm" variant="ghost" className="flex items-center gap-1" onClick={() => setShowReplyForm(!showReplyForm)}>
              <Reply className="h-4 w-4" /> Reply
            </Button>
            {allReplies.length > 0 && (
              <Button size="sm" variant="ghost" className="flex items-center gap-1" onClick={() => setShowReplies(!showReplies)}>
                {showReplies ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {allReplies.length} {allReplies.length === 1 ? 'reply' : 'replies'}
              </Button>
            )}
          </div>

          {showReplyForm && (
            <Form {...replyForm}>
              <form onSubmit={replyForm.handleSubmit(({ text }) => handleReply(text))} className="flex items-start gap-2 mt-2">
                <Avatar className="h-8 w-8 mt-1"><AvatarFallback>U</AvatarFallback></Avatar>
                <FormField control={replyForm.control} name="text" render={({ field }: any) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Textarea rows={2} className="resize-none text-sm" placeholder="Write a reply..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" size="sm">Send</Button>
              </form>
            </Form>
          )}

          {showReplies && (
            <div className="ml-8 pl-4 border-l-2 border-border space-y-2 mt-2">
              {repliesLoading ? (
                <div className="text-xs text-muted-foreground py-2">Loading replies...</div>
              ) : allReplies.length > 0 ? (
                allReplies.map(reply => (
                  <div key={reply.id} className="flex items-start gap-2 p-1">
                    <Avatar className="h-6 w-6"><AvatarFallback>U</AvatarFallback></Avatar>
                    <div className="flex-1">
                      <p className="text-sm text-foreground/90">{reply.text}</p>
                      {reply.createdAt?.toDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <ClientOnlyTime date={reply.createdAt.toDate()} />
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-2">No replies yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
