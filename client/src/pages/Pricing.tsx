import { Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { FAQ } from '@/components/pricing/FAQ';
import { Link } from 'wouter';

// Declare the custom element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'pricing-table-id': string;
          'publishable-key': string;
          'client-reference-id'?: string;
          'customer-email'?: string;
        },
        HTMLElement
      >;
    }
  }
}

export default function Pricing() {
  const { user } = useAuth();

  // Check if user has premium subscription
  const isPremium = user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7E6CA] to-white">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-[#660033]">
          Aermuse
        </Link>
        <div className="flex items-center gap-6">
          {user ? (
            <Link href="/dashboard" className="text-[#660033] hover:underline">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth" className="text-[#660033] hover:underline">
                Sign In
              </Link>
              <Link
                href="/auth"
                className="px-4 py-2 bg-[#660033] text-[#F7E6CA] rounded-lg hover:bg-[#4a0024] transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-[#660033] mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-[#660033]/80 max-w-2xl mx-auto">
          Get the tools you need to understand and manage your music contracts with confidence.
        </p>
      </div>

      {/* Stripe Pricing Table */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        {isPremium ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-[#660033] mb-2">You're on Premium!</h3>
            <p className="text-[#660033]/70 mb-6">
              You have full access to all Aermuse features.
            </p>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-[#660033] text-[#F7E6CA] rounded-lg hover:bg-[#4a0024] transition-colors inline-block"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <stripe-pricing-table
            pricing-table-id="prctbl_1SZICN101ChWmdbe3T1jVnsF"
            publishable-key="pk_test_51SYTb0101ChWmdbekGLDl2IVZYx6vKDTEfEGXZ8SXeRiig4U3ARrYYyMqV4ixlyV0HpKEhruQSniLJENjylHTU2Q00ZsfOe440"
            client-reference-id={user?.id}
            customer-email={user?.email}
          />
        )}
      </div>

      {/* Value Proposition */}
      <div className="bg-[#660033] text-[#F7E6CA] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl font-bold mb-4">
            Why Musicians Choose Aermuse
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Stop signing contracts you don't fully understand. Our AI-powered analysis
            helps you spot unfair terms, understand complex clauses, and negotiate better deals.
          </p>
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="opacity-80">Contracts Analyzed</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">85%</div>
              <div className="opacity-80">Users Found Issues</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24h</div>
              <div className="opacity-80">Average Response Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-[#660033]">
          Frequently Asked Questions
        </h2>
        <FAQ />
      </div>

      {/* Footer */}
      <footer className="bg-white py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} Aermuse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
