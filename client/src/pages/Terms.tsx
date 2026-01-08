import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation, Link } from 'wouter';

export default function Terms() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4">
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

        <div className="prose prose-sm max-w-none bg-white rounded-lg border p-8">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using AERMUSE ("the Service"), you agree to be bound by these
            Terms of Service. If you do not agree to these terms, please do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            AERMUSE provides a platform for musicians and artists to manage contracts,
            including AI-powered contract analysis, e-signature capabilities, contract
            templates, and artist landing pages. The Service is designed to help artists
            understand and manage their contractual agreements.
          </p>

          <h2>3. AI Analysis Disclaimer</h2>
          <p>
            The AI-powered contract analysis feature provided by AERMUSE is for
            informational and educational purposes only. This service does not
            constitute legal advice and should not be relied upon as a substitute
            for consultation with a qualified attorney.
          </p>

          <h3>3.1 Limitations of AI Analysis</h3>
          <ul>
            <li>The AI may not identify all issues in a contract</li>
            <li>Interpretations may vary based on jurisdiction and context</li>
            <li>
              The analysis is based on general patterns and may not account for
              your specific situation
            </li>
            <li>Contract law is complex and varies significantly by location</li>
            <li>AI technology has inherent limitations and may produce errors</li>
          </ul>

          <h3>3.2 Your Responsibilities</h3>
          <p>
            By using the AI analysis feature, you acknowledge and agree that:
          </p>
          <ul>
            <li>You will not rely solely on this analysis for legal decisions</li>
            <li>You should consult a licensed attorney for legal advice</li>
            <li>You understand the AI may make errors</li>
            <li>You are responsible for your own legal and business decisions</li>
          </ul>

          <h2>4. User Accounts</h2>
          <p>
            To access certain features of the Service, you must create an account.
            You are responsible for:
          </p>
          <ul>
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized use of your account</li>
            <li>Providing accurate and complete registration information</li>
          </ul>

          <h2>5. Subscription and Payments</h2>
          <h3>5.1 Subscription Plans</h3>
          <p>
            AERMUSE offers both free and paid subscription plans. Paid plans provide
            access to additional features including unlimited contracts, AI analysis,
            e-signatures, and premium templates.
          </p>

          <h3>5.2 Billing</h3>
          <p>
            Paid subscriptions are billed monthly. You authorize us to charge your
            payment method on a recurring basis until you cancel your subscription.
          </p>

          <h3>5.3 Cancellation</h3>
          <p>
            You may cancel your subscription at any time through your account settings.
            Upon cancellation, you will retain access to paid features until the end
            of your current billing period.
          </p>

          <h3>5.4 Refunds</h3>
          <p>
            Subscription fees are non-refundable except as required by applicable law
            or at our sole discretion.
          </p>

          <h2>6. User Content</h2>
          <h3>6.1 Your Content</h3>
          <p>
            You retain ownership of any contracts, documents, or other content you
            upload to the Service ("User Content"). By uploading User Content, you
            grant us a limited license to process, store, and display your content
            as necessary to provide the Service.
          </p>

          <h3>6.2 Content Restrictions</h3>
          <p>You agree not to upload content that:</p>
          <ul>
            <li>Violates any applicable law or regulation</li>
            <li>Infringes on third-party intellectual property rights</li>
            <li>Contains malicious code or harmful content</li>
            <li>Is fraudulent, deceptive, or misleading</li>
          </ul>

          <h2>7. E-Signature Services</h2>
          <p>
            AERMUSE provides e-signature functionality through integration with
            third-party services. By using e-signature features, you agree that:
          </p>
          <ul>
            <li>Electronic signatures are legally binding in most jurisdictions</li>
            <li>You have authority to sign documents on your own behalf</li>
            <li>You will verify the identity of other signatories where appropriate</li>
            <li>
              You understand that some documents may require traditional signatures
              by law
            </li>
          </ul>

          <h2>8. Artist Landing Pages</h2>
          <p>
            Artists may create public landing pages through the Service. You are
            solely responsible for the content displayed on your landing page and
            must ensure it complies with applicable laws and these terms.
          </p>

          <h2>9. Intellectual Property</h2>
          <p>
            The Service, including its design, features, and content (excluding User
            Content), is owned by Aermuse Ltd and protected by intellectual property
            laws. You may not copy, modify, or distribute any part of the Service
            without our prior written consent.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Aermuse Ltd and its affiliates
            shall not be liable for any indirect, incidental, special, consequential,
            or punitive damages arising from your use of the Service. Our total
            liability shall not exceed the amount you paid for the Service in the
            twelve months preceding the claim.
          </p>

          <h2>11. Disclaimer of Warranties</h2>
          <p>
            The Service is provided "as is" and "as available" without warranties
            of any kind, either express or implied. We do not guarantee that the
            Service will be uninterrupted, error-free, or secure.
          </p>

          <h2>12. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Aermuse Ltd from any claims,
            damages, or expenses arising from your use of the Service, violation
            of these terms, or infringement of any third-party rights.
          </p>

          <h2>13. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time
            for violation of these terms or for any other reason at our discretion.
            Upon termination, your right to use the Service will immediately cease.
          </p>

          <h2>14. Governing Law</h2>
          <p>
            These terms shall be governed by and construed in accordance with the
            laws of England and Wales. Any disputes arising from these terms or your
            use of the Service shall be subject to the exclusive jurisdiction of
            the courts of England and Wales.
          </p>

          <h2>15. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. We will notify you of
            material changes via email or through the platform. Continued use of
            the Service after changes constitutes acceptance of the new terms.
          </p>

          <h2>16. Privacy</h2>
          <p>
            Your use of the Service is also governed by our{' '}
            <Link href="/privacy" className="text-[#660033] hover:underline">
              Privacy Policy
            </Link>
            , which describes how we collect, use, and protect your information.
          </p>

          <h2>17. Contact</h2>
          <p>
            If you have questions about these terms, please contact us at{' '}
            <a href="mailto:served@aermuse.com" className="text-[#660033] hover:underline">
              served@aermuse.com
            </a>
            .
          </p>

          <p className="text-sm text-gray-500 mt-8">
            Last updated: December 30, 2025
          </p>
        </div>
      </div>
    </div>
  );
}
