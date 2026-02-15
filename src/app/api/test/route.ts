import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';

export async function GET() {
  const snapshot = await db.collection('users').limit(5).get();
  const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ users });
}
