import { useState, useRef, useEffect } from 'react';
import { Mail, Building2, Calendar, MoreVertical, Trash2, Archive, CheckCircle, Eye } from 'lucide-react';

interface Proposal {
  id: string;
  senderName: string;
  senderEmail: string;
  senderCompany: string | null;
  proposalType: string;
  message: string;
  status: 'new' | 'viewed' | 'responded' | 'archived';
  createdAt: string;
  landingPage: {
    id: string;
    artistName: string;
  } | null;
}

interface Props {
  proposal: Proposal;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-[rgba(59,130,246,0.15)] text-[#3b82f6]',
  viewed: 'bg-[rgba(102,0,51,0.08)] text-[rgba(102,0,51,0.6)]',
  responded: 'bg-[rgba(40,167,69,0.15)] text-[#28a745]',
  archived: 'bg-[rgba(102,0,51,0.05)] text-[rgba(102,0,51,0.4)]',
};

const PROPOSAL_TYPE_LABELS: Record<string, string> = {
  collaboration: 'Collaboration',
  licensing: 'Licensing',
  booking: 'Booking',
  recording: 'Recording',
  distribution: 'Distribution',
  other: 'Other',
};

export function ProposalCard({ proposal, onStatusChange, onDelete, onSelect }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const messagePreview = proposal.message.length > 150
    ? proposal.message.substring(0, 150) + '...'
    : proposal.message;

  return (
    <div
      className={`rounded-[20px] p-6 transition-all duration-300 hover:shadow-[0_15px_40px_rgba(102,0,51,0.08)] ${
        proposal.status === 'new' ? 'border-l-4 border-l-[#3b82f6]' : ''
      }`}
      style={{ background: 'rgba(255, 255, 255, 0.6)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <button
              onClick={() => onSelect(proposal.id)}
              className="font-bold text-[#660033] hover:underline cursor-pointer"
            >
              {proposal.senderName}
            </button>
            <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-[0.05em] rounded-full ${STATUS_COLORS[proposal.status]}`}>
              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
            </span>
            <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-[0.05em] rounded-full bg-[rgba(102,0,51,0.1)] text-[#660033]">
              {PROPOSAL_TYPE_LABELS[proposal.proposalType] || proposal.proposalType}
            </span>
          </div>

          {/* Contact Info */}
          <div className="flex items-center gap-4 text-sm text-[rgba(102,0,51,0.6)] mb-3 flex-wrap">
            <a
              href={`mailto:${proposal.senderEmail}`}
              className="flex items-center gap-1.5 hover:text-[#660033] transition-colors"
            >
              <Mail size={14} />
              {proposal.senderEmail}
            </a>
            {proposal.senderCompany && (
              <span className="flex items-center gap-1.5">
                <Building2 size={14} />
                {proposal.senderCompany}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {formatDate(proposal.createdAt)}
            </span>
          </div>

          {/* Message Preview */}
          <p className="text-[rgba(102,0,51,0.7)] text-sm leading-relaxed">{messagePreview}</p>

          {/* Landing Page */}
          {proposal.landingPage && (
            <p className="text-xs text-[rgba(102,0,51,0.4)] mt-3">
              via {proposal.landingPage.artistName}
            </p>
          )}
        </div>

        {/* Actions Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2.5 rounded-xl hover:bg-[rgba(102,0,51,0.06)] transition-all"
          >
            <MoreVertical size={18} className="text-[rgba(102,0,51,0.5)]" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-12 w-52 bg-white rounded-xl py-2 z-10"
              style={{ boxShadow: '0 20px 50px rgba(102, 0, 51, 0.15)' }}
            >
              <button
                onClick={() => {
                  onSelect(proposal.id);
                  setShowMenu(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-[#660033] hover:bg-[rgba(102,0,51,0.06)] transition-all"
              >
                <Eye size={16} />
                View Details
              </button>
              <a
                href={`mailto:${proposal.senderEmail}?subject=Re: Your ${PROPOSAL_TYPE_LABELS[proposal.proposalType] || ''} Proposal`}
                onClick={() => {
                  onStatusChange(proposal.id, 'responded');
                  setShowMenu(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-[#660033] hover:bg-[rgba(102,0,51,0.06)] transition-all"
              >
                <Mail size={16} />
                Reply via Email
              </a>
              {proposal.status !== 'responded' && (
                <button
                  onClick={() => {
                    onStatusChange(proposal.id, 'responded');
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-[#660033] hover:bg-[rgba(102,0,51,0.06)] transition-all"
                >
                  <CheckCircle size={16} />
                  Mark as Responded
                </button>
              )}
              {proposal.status !== 'archived' && (
                <button
                  onClick={() => {
                    onStatusChange(proposal.id, 'archived');
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-[#660033] hover:bg-[rgba(102,0,51,0.06)] transition-all"
                >
                  <Archive size={16} />
                  Archive
                </button>
              )}
              <hr className="my-2 border-[rgba(102,0,51,0.08)]" />
              <button
                onClick={() => {
                  onDelete(proposal.id);
                  setShowMenu(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-[#dc3545] hover:bg-[rgba(220,53,69,0.06)] transition-all"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
