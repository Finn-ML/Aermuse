import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards including Visa, Mastercard, and American Express. Payments are securely processed through Stripe.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: "Yes, you can cancel your subscription at any time from your billing settings. You'll continue to have access until the end of your current billing period.",
  },
  {
    question: 'Is there a free trial?',
    answer: 'We offer a free tier that lets you try Aermuse with up to 3 contracts. This lets you experience the platform before committing to Premium.',
  },
  {
    question: 'What happens to my contracts if I cancel?',
    answer: "Your contracts remain safely stored in your account. However, you'll lose access to AI analysis and e-signing features until you resubscribe.",
  },
  {
    question: 'Is the AI analysis legally binding advice?',
    answer: "No, Aermuse provides AI-powered analysis to help you understand your contracts, but it's not a substitute for professional legal advice. We always recommend consulting with a qualified attorney for important legal decisions.",
  },
  {
    question: 'How secure is my contract data?',
    answer: 'We take security seriously. All documents are encrypted at rest and in transit. We never share your data with third parties, and you can delete your data at any time.',
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer: "You can upgrade to Premium at any time. If you downgrade, you'll keep Premium access until your current billing period ends.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-lg overflow-hidden bg-white"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-900">{faq.question}</span>
            <ChevronDown
              className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                openIndex === index ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-200 ${
              openIndex === index ? 'max-h-96' : 'max-h-0'
            }`}
          >
            <div className="px-4 pb-4 text-gray-600">{faq.answer}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
