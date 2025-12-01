import { useState } from 'react';
import { Send } from 'lucide-react';
import { ProposalFormModal } from './ProposalFormModal';

interface SendProposalButtonProps {
  landingPageId: string;
  artistName: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export function SendProposalButton({
  landingPageId,
  artistName,
  primaryColor = '#660033',
  secondaryColor = '#F7E6CA',
}: SendProposalButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-full shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          backgroundColor: isHovered ? `${primaryColor}dd` : primaryColor,
          color: secondaryColor,
          boxShadow: isHovered ? `0 10px 30px ${primaryColor}40` : undefined,
          transform: isHovered ? 'translateY(-2px)' : undefined,
        }}
        aria-label={`Send a proposal to ${artistName}`}
      >
        <Send className="h-5 w-5" />
        Send Proposal
      </button>

      <ProposalFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        landingPageId={landingPageId}
        artistName={artistName}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
    </>
  );
}
