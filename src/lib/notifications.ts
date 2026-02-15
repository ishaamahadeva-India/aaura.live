
import { db } from '@/lib/firebase/admin';
import type { Firestore } from 'firebase-admin/firestore';

export interface CreateNotificationParams {
  userId: string;
  type: 'like' | 'comment' | 'reply' | 'follow';
  contentId?: string;
  contentType?: string;
  message: string;
  metadata?: {
    authorName?: string;
    contentTitle?: string;
    commentText?: string;
  };
}

/**
 * Create a notification for a user (server-side only)
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await db.collection('notifications').add({
      userId: params.userId,
      type: params.type,
      contentId: params.contentId,
      contentType: params.contentType,
      message: params.message,
      metadata: params.metadata || {},
      read: false,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create notification when content is liked
 */
export async function notifyLike(
  contentAuthorId: string,
  likerId: string,
  contentId: string,
  contentType: string,
  contentTitle?: string
): Promise<void> {
  if (contentAuthorId === likerId) return; // Don't notify self-likes

  try {
    const likerDoc = await db.collection('users').doc(likerId).get();
    const likerName = likerDoc.data()?.displayName || likerDoc.data()?.fullName || 'Someone';

    await createNotification({
      userId: contentAuthorId,
      type: 'like',
      contentId,
      contentType,
      message: `${likerName} liked your ${contentType}`,
      metadata: {
        authorName: likerName,
        contentTitle,
      },
    });
  } catch (error) {
    console.error('Error creating like notification:', error);
  }
}

/**
 * Create notification when content is commented on
 */
export async function notifyComment(
  contentAuthorId: string,
  commenterId: string,
  contentId: string,
  contentType: string,
  commentText: string,
  contentTitle?: string
): Promise<void> {
  if (contentAuthorId === commenterId) return; // Don't notify self-comments

  try {
    const commenterDoc = await db.collection('users').doc(commenterId).get();
    const commenterName = commenterDoc.data()?.displayName || commenterDoc.data()?.fullName || 'Someone';

    await createNotification({
      userId: contentAuthorId,
      type: 'comment',
      contentId,
      contentType,
      message: `${commenterName} commented on your ${contentType}`,
      metadata: {
        authorName: commenterName,
        contentTitle,
        commentText: commentText.substring(0, 100), // Truncate long comments
      },
    });
  } catch (error) {
    console.error('Error creating comment notification:', error);
  }
}

/**
 * Create notification when comment is replied to
 */
export async function notifyReply(
  commentAuthorId: string,
  replierId: string,
  contentId: string,
  contentType: string,
  replyText: string
): Promise<void> {
  if (commentAuthorId === replierId) return; // Don't notify self-replies

  try {
    const replierDoc = await db.collection('users').doc(replierId).get();
    const replierName = replierDoc.data()?.displayName || replierDoc.data()?.fullName || 'Someone';

    await createNotification({
      userId: commentAuthorId,
      type: 'reply',
      contentId,
      contentType,
      message: `${replierName} replied to your comment`,
      metadata: {
        authorName: replierName,
        commentText: replyText.substring(0, 100),
      },
    });
  } catch (error) {
    console.error('Error creating reply notification:', error);
  }
}

