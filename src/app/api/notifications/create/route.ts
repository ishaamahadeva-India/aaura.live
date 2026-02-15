
import { NextRequest, NextResponse } from 'next/server';
import { notifyLike, notifyComment, notifyReply } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, contentAuthorId, actorId, contentId, contentType, contentTitle, text } = body;

    if (!contentAuthorId || !actorId || !contentId || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    switch (type) {
      case 'like':
        await notifyLike(contentAuthorId, actorId, contentId, contentType, contentTitle);
        break;
      case 'comment':
        if (!text) {
          return NextResponse.json(
            { error: 'Comment text is required' },
            { status: 400 }
          );
        }
        await notifyComment(contentAuthorId, actorId, contentId, contentType, text, contentTitle);
        break;
      case 'reply':
        if (!text) {
          return NextResponse.json(
            { error: 'Reply text is required' },
            { status: 400 }
          );
        }
        await notifyReply(contentAuthorId, actorId, contentId, contentType, text);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

