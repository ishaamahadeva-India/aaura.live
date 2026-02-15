
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <main className="container mx-auto px-4 py-8 md:py-16">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <h2>1. Information We Collect</h2>
          <p>
            We may collect personal information that you provide to us, such
            as your name, email address, and birth details when you create an
            account and use our services.
          </p>

          <h2>2. How We Use Your Information</h2>
          <p>
            We use the information we collect to operate, maintain, and
            provide the features and functionality of the app, including
            personalizing your horoscope and feed.
          </p>

          <h2>3. Data Security</h2>
          <p>
            We use commercially reasonable safeguards to help keep the
            information collected through the service secure. However, no
            security system is impenetrable, and we cannot guarantee the
            security of our systems 100%.
          </p>

          <h2>4. Third-Party Services</h2>
          <p>
            Our app may contain links to third-party websites or services that
            are not owned or controlled by Aaura. We have no control over and
            assume no responsibility for the content, privacy policies, or
            practices of any third-party websites or services.
          </p>
           <p className="mt-8 text-sm text-muted-foreground">
            This is a placeholder document. Please replace with your official Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
