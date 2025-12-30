import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Privacy() {
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

        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

        <div className="prose prose-sm max-w-none bg-white rounded-lg border p-8">
          <h2>Overview</h2>
          <p>
            AERMUSE is committed to protecting your privacy. This policy explains
            how we collect, use, and safeguard your information when you use our
            platform.
          </p>

          <h2>Information We Collect</h2>

          <h3>Account Information</h3>
          <p>
            When you create an account, we collect your email address and password
            (securely hashed). This information is necessary to provide our services.
          </p>

          <h3>Contract Documents</h3>
          <p>
            Documents you upload for AI analysis are processed securely. Contract
            content is sent to OpenAI's API for analysis but is not stored by OpenAI
            for training purposes. We retain your documents only as long as necessary
            to provide our services.
          </p>

          <h3>Landing Page Analytics</h3>
          <p>
            When visitors view artist landing pages, we collect anonymous analytics
            to help artists understand their audience:
          </p>
          <ul>
            <li>
              <strong>Page views</strong> - We track when pages are viewed to count
              total and unique visitors
            </li>
            <li>
              <strong>Time on page</strong> - We measure how long visitors spend on
              a page
            </li>
            <li>
              <strong>Link clicks</strong> - We track which links visitors click
            </li>
          </ul>

          <h3>How We Protect Visitor Privacy</h3>
          <p>
            Our analytics are designed to be privacy-conscious:
          </p>
          <ul>
            <li>
              <strong>No cookies</strong> - We use browser session storage, not
              cookies
            </li>
            <li>
              <strong>No personal data stored</strong> - We do not store IP addresses
              or personal identifiers directly
            </li>
            <li>
              <strong>Hashed identifiers</strong> - Visitor identification uses
              one-way cryptographic hashes that cannot be reversed
            </li>
            <li>
              <strong>No third-party sharing</strong> - Analytics data is never
              shared with advertisers or third parties
            </li>
            <li>
              <strong>First-party only</strong> - All tracking is for the artist's
              own analytics, not cross-site tracking
            </li>
          </ul>

          <h2>How We Use Information</h2>
          <p>We use collected information to:</p>
          <ul>
            <li>Provide and improve our services</li>
            <li>Send important account notifications</li>
            <li>Provide artists with analytics about their landing pages</li>
            <li>Ensure platform security and prevent abuse</li>
          </ul>

          <h2>Data Sharing</h2>
          <p>
            We do not sell your personal information. We only share data with:
          </p>
          <ul>
            <li>
              <strong>OpenAI</strong> - For AI contract analysis (contract content
              only, processed under their API terms)
            </li>
            <li>
              <strong>Stripe</strong> - For payment processing (payment information
              only)
            </li>
            <li>
              <strong>DocuSeal</strong> - For e-signature functionality (signature
              documents only)
            </li>
          </ul>

          <h2>Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as needed
            to provide services. You can request deletion of your account and
            associated data at any time through your account settings.
          </p>

          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and data</li>
            <li>Export your data</li>
          </ul>

          <h2>Security</h2>
          <p>
            We implement industry-standard security measures including encrypted
            connections (HTTPS), secure password hashing (bcrypt), and access
            controls to protect your information.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. We will notify you of
            significant changes via email or through the platform.
          </p>

          <h2>Contact</h2>
          <p>
            If you have questions about this privacy policy, please contact us at
            privacy@aermuse.com.
          </p>

          <p className="text-sm text-gray-500 mt-8">
            Last updated: December 3, 2025
          </p>
        </div>
      </div>
    </div>
  );
}
