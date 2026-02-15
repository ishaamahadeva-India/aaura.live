
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfUsePage() {
  return (
    <main className="container mx-auto px-4 py-8 md:py-16">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">Terms of Use</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <h2>1. Introduction</h2>
          <p>
            Welcome to Aaura. By accessing our application, you agree to be
            bound by these Terms of Use, all applicable laws and regulations,
            and agree that you are responsible for compliance with any
            applicable local laws.
          </p>

          <h2>2. Use License</h2>
          <p>
            Permission is granted to temporarily download one copy of the
            materials on Aaura's application for personal, non-commercial
            transitory viewing only. This is the grant of a license, not a
            transfer of title.
          </p>

          <h2>3. Disclaimer</h2>
          <p>
            The materials on Aaura's application are provided on an 'as is'
            basis. Aaura makes no warranties, expressed or implied, and
            hereby disclaims and negates all other warranties including,
            without limitation, implied warranties or conditions of
            merchantability, fitness for a particular purpose, or
            non-infringement of intellectual property or other violation of
            rights.
          </p>

          <h2>4. Limitations</h2>
          <p>
            In no event shall Aaura or its suppliers be liable for any damages
            (including, without limitation, damages for loss of data or profit,
            or due to business interruption) arising out of the use or
            inability to use the materials on Aaura's application.
          </p>

          <h2>5. Governing Law</h2>
          <p>
            These terms and conditions are governed by and construed in
            accordance with the laws of India and you irrevocably submit to
            the exclusive jurisdiction of the courts in that State or location.
          </p>
           <p className="mt-8 text-sm text-muted-foreground">
            This is a placeholder document. Please replace with your official Terms of Use.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
