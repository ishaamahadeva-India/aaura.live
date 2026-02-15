
'use client';

// This page is no longer needed as content creation is now direct.
// We will redirect users to the main content management page.

import { redirect } from 'next/navigation';

export default function ContentStubsRedirectPage() {
    redirect('/admin/content');
    return null;
}
    
