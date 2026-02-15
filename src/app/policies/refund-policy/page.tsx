
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RefundPolicyPage() {
  return (
    <main className="container mx-auto px-4 py-8 md:py-16">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">Refund Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <h2>1. Digital Products & Services</h2>
          <p>
            Due to the nature of digital services, all payments made for
            subscriptions, donations, and virtual offerings within the Aaura
            app are non-refundable. Once a payment or donation is made, it
            is final.
          </p>

          <h2>2. Physical Products (Marketplace)</h2>
          <p>
            For physical products purchased through our marketplace, refunds
            and returns are subject to the policies of the individual vendor
            from whom the product was purchased. Please refer to the specific
            seller's policy on the product page. Aaura does not directly
            handle returns or refunds for marketplace items.
          </p>

          <h2>3. Erroneous Charges</h2>
          <p>
            In the case of a technical error resulting in an incorrect charge,
            please contact our support team with your transaction details within
            7 days of the transaction. We will investigate the issue and issue
            a refund if it is determined that a billing error occurred on our
            end.
          </p>
           <p className="mt-8 text-sm text-muted-foreground">
            This is a placeholder document. Please replace with your official Refund Policy.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
