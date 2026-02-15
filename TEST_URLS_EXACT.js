// Test script to verify correct URL encoding
// Run this in browser console or Node.js

const storagePath = 'posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/1765386915714-WhatsApp Video 2025-12-09 at 18.44.03.mp4';
const bucket = 'studio-9632556640-bd58d';

// Method 1: Encode each segment separately (what Worker does)
const segments = storagePath.split('/');
const encodedSegments = segments.map(s => encodeURIComponent(s));
const encodedPath1 = encodedSegments.join('%2F');

// Method 2: Encode entire path (alternative)
const encodedPath2 = encodeURIComponent(storagePath).replace(/\//g, '%2F');

console.log('Original path:', storagePath);
console.log('\nMethod 1 (segment by segment):');
console.log('Encoded:', encodedPath1);
console.log('URL:', `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath1}?alt=media`);

console.log('\nMethod 2 (entire path):');
console.log('Encoded:', encodedPath2);
console.log('URL:', `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath2}?alt=media`);

// Test both URLs
console.log('\n--- Testing URLs ---');
const url1 = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath1}?alt=media`;
const url2 = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath2}?alt=media`;

// In browser, you can test:
// fetch(url1).then(r => console.log('Method 1:', r.status, r.ok ? '✅' : '❌'));
// fetch(url2).then(r => console.log('Method 2:', r.status, r.ok ? '✅' : '❌'));









