'use server';

import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const idToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await auth.verifyIdToken(idToken);
    const userId = decoded.uid;

    const campaignsSnapshot = await db
      .collection('advertiserCampaigns')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const rows: string[] = [];
    rows.push('Campaign ID,Title,Status,Impressions,Clicks,CTR,Spend');

    campaignsSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const title = data?.creative?.title || data?.advertiser?.businessName || 'Campaign';
      const status = data.status || 'pending';
      const impressions = data.impressions || 0;
      const clicks = data.clicks || 0;
      const ctr = impressions ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
      const spend = data.totalAmount || 0;
      rows.push(
        `${docSnap.id},"${title.replace(/"/g, '""')}",${status},${impressions},${clicks},${ctr},${spend}`,
      );
    });

    const csv = rows.join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="aaura-campaigns.csv"',
      },
    });
  } catch (error: any) {
    console.error('Failed to export campaigns', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
