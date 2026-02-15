
'use client';
import { redirect } from 'next/navigation';

export default function CheckoutRedirect() {
    // This page is deprecated in favor of the unified /cart page.
    // We redirect any old links to the cart.
    redirect('/cart');
    return null;
}
