
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DeliveryPolicyPage() {
  return (
    <main className="container mx-auto px-4 py-8 md:py-16">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">Shipping & Delivery Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <h2>1. Scope</h2>
          <p>
            This policy applies to physical goods purchased through the Aaura
            marketplace. Digital services and subscriptions are delivered
            instantly upon successful payment and do not involve physical
            shipping.
          </p>

          <h2>2. Shipping Responsibility</h2>
          <p>
            Shipping and delivery are the sole responsibility of the
            individual vendors selling products on our marketplace. Aaura does
            not handle inventory, packaging, or shipping.
          </p>

          <h2>3. Shipping Times</h2>
          <p>
            Estimated shipping times are provided by the vendor on each
            product page. These are estimates and are not guaranteed by Aaura.
            Delivery times may vary based on your location and the vendor's
            shipping partner.
          </p>

          <h2>4. Tracking and Issues</h2>
          <p>
            Once an order is shipped, the vendor is responsible for providing
            tracking information. For any issues related to delivery, including
            delays or non-receipt of items, please contact the vendor directly
            through the order details page.
          </p>
           <p className="mt-8 text-sm text-muted-foreground">
            This is a placeholder document. Please replace with your official Delivery Policy.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
