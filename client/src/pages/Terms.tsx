import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Terms() {
  const [, setLocation] = useLocation();

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
          <h2>AI Analysis Disclaimer</h2>
          <p>
            The AI-powered contract analysis feature provided by Aermuse is for
            informational and educational purposes only. This service does not
            constitute legal advice, and should not be relied upon as a substitute
            for consultation with a qualified attorney.
          </p>

          <h3>Limitations of AI Analysis</h3>
          <ul>
            <li>The AI may not identify all issues in a contract</li>
            <li>Interpretations may vary based on jurisdiction and context</li>
            <li>
              The analysis is based on general patterns and may not account for
              your specific situation
            </li>
            <li>Contract law is complex and varies significantly by location</li>
          </ul>

          <h3>Your Responsibilities</h3>
          <p>
            By using the AI analysis feature, you acknowledge and agree that:
          </p>
          <ul>
            <li>You will not rely solely on this analysis for legal decisions</li>
            <li>You should consult a licensed attorney for legal advice</li>
            <li>You understand the AI may make errors</li>
            <li>
              You are responsible for your own legal and business decisions
            </li>
          </ul>

          <h3>Limitation of Liability</h3>
          <p>
            Aermuse Ltd and its affiliates disclaim all liability for actions
            taken or not taken based on the AI analysis. We provide this tool
            as-is without warranties of any kind.
          </p>

          <h2>Use of Service</h2>
          <p>
            By using Aermuse, you agree to use the service in accordance with
            applicable laws and these terms. You are responsible for maintaining
            the confidentiality of your account credentials.
          </p>

          <h2>Privacy</h2>
          <p>
            Contract documents you upload are processed securely. We do not share
            your contract content with third parties except as necessary to
            provide the AI analysis service (OpenAI API). For more details, see
            our Privacy Policy.
          </p>

          <h2>Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the
            service after changes constitutes acceptance of the new terms.
          </p>

          <h2>Contact</h2>
          <p>
            If you have questions about these terms, please contact us at
            legal@aermuse.com.
          </p>

          <p className="text-sm text-gray-500 mt-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
