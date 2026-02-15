
"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useAuth, useFirestore } from "@/lib/firebase/provider";
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'reply' | 'follow';
  userId: string;
  contentId?: string;
  contentType?: string;
  message: string;
  read: boolean;
  createdAt: any;
  metadata?: {
    authorName?: string;
    contentTitle?: string;
    commentText?: string;
  };
}

export const useNotifications = () => {
  const [user] = useAuthState(useAuth());
  const db = useFirestore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];

      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, db]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!db || !user) return;

    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [db, user]);

  const markAllAsRead = useCallback(async () => {
    if (!db || !user) return;

    try {
      const batch = writeBatch(db);
      const unreadNotifications = notifications.filter(n => !n.read);
      
      unreadNotifications.forEach(notif => {
        const notificationRef = doc(db, 'notifications', notif.id);
        batch.update(notificationRef, { read: true });
      });

      await batch.commit();
      toast({ title: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({ variant: 'destructive', title: 'Failed to mark notifications as read' });
    }
  }, [db, user, notifications, toast]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
};

