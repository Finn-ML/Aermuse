import { Mail, Building2, Calendar, Trash2, Archive, CheckCircle, ArrowLeft, FileText, ExternalLink } from 'lucide-react';

interface Proposal {
  id: string;
  senderName: string;
  senderEmail: string;
  senderCompany: string | null;
  proposalType: string;
  message: string;
  status: 'new' | 'viewed' | 'responded' | 'archived';
  createdAt: string;
  viewedAt: string | null;
  respondedAt: string | null;
  contractId: string | null;
  landingPage: {
    id: string;
    artistName: string;
  } | null;
}

interface Props {
  proposal: Proposal;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  onBack: () => void;
  onCreateContract: () => void;
  onViewContract: (contractId: string) => void;
}

const PROPOSAL_TYPE_LABELS: Record<string, string> = {
  collaboration: 'Collaboration',
  licensing: 'Licensing',
  booking: 'Booking',
  recording: 'Recording',
  distribution: 'Distribution',
  other: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-[rgba(59,130,246,0.15)] text-[#3b82f6]',
  viewed: 'bg-[rgba(102,0,51,0.08)] text-[rgba(102,0,51,0.6)]',
  responded: 'bg-[rgba(40,167,69,0.15)] text-[#28a745]',
  archived: 'bg-[rgba(102,0,51,0.05)] text-[rgba(102,0,51,0.4)]',
};

export function ProposalDetail({ proposal, onStatusChange, onDelete, onBack, onCreateContract, onViewContract }: Props) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this proposal?')) {
      onDelete();
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[rgba(102,0,51,0.6)] hover:text-[#660033] transition-colors font-medium"
      >
        <ArrowLeft size={18} />
        Back to Proposals
      </button>

      {/* Header Card */}
      <div
        className="rounded-[20px] p-7"
        style={{ background: 'rgba(255, 255, 255, 0.6)' }}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-[#660033]">{proposal.senderName}</h1>
              <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-[0.05em] rounded-full ${STATUS_COLORS[proposal.status]}`}>
                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
              </span>
            </div>
            {proposal.landingPage && (
              <p className="text-[rgba(102,0,51,0.6)]">
                via {proposal.landingPage.artistName}
              </p>
            )}
          </div>
          <span className="px-4 py-2 text-sm font-bold rounded-full bg-[rgba(102,0,51,0.1)] text-[#660033]">
            {PROPOSAL_TYPE_LABELS[proposal.proposalType] || proposal.proposalType}
          </span>
        </div>

        {/* Contact Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(102, 0, 51, 0.08)' }}
            >
              <Mail size={20} className="text-[#660033]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)]">Email</p>
              <a href={`mailto:${proposal.senderEmail}`} className="text-[#660033] hover:underline font-medium">
                {proposal.senderEmail}
              </a>
            </div>
          </div>

          {proposal.senderCompany && (
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(102, 0, 51, 0.08)' }}
              >
                <Building2 size={20} className="text-[#660033]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)]">Company</p>
                <p className="font-medium text-[#660033]">{proposal.senderCompany}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(102, 0, 51, 0.08)' }}
            >
              <Calendar size={20} className="text-[#660033]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)]">Received</p>
              <p className="font-medium text-[#660033]">{formatDate(proposal.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Message */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-3">Message</h2>
          <div
            className="rounded-xl p-5 whitespace-pre-wrap text-[rgba(102,0,51,0.8)] leading-relaxed"
            style={{ background: 'rgba(102, 0, 51, 0.04)' }}
          >
            {proposal.message}
          </div>
        </div>
      </div>

      {/* Actions Card */}
      <div
        className="rounded-[20px] p-7"
        style={{ background: 'rgba(255, 255, 255, 0.6)' }}
      >
        <h2 className="text-lg font-bold text-[#660033] mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={`mailto:${proposal.senderEmail}?subject=Re: Your ${PROPOSAL_TYPE_LABELS[proposal.proposalType] || ''} Proposal`}
            onClick={() => onStatusChange('responded')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all"
          >
            <Mail size={18} />
            Reply via Email
          </a>

          {proposal.status !== 'responded' && (
            <button
              onClick={() => onStatusChange('responded')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[rgba(102,0,51,0.1)] text-[#660033] rounded-xl font-semibold text-sm hover:bg-[rgba(102,0,51,0.15)] transition-all"
            >
              <CheckCircle size={18} />
              Mark as Responded
            </button>
          )}

          {proposal.status !== 'archived' && (
            <button
              onClick={() => onStatusChange('archived')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[rgba(102,0,51,0.1)] text-[#660033] rounded-xl font-semibold text-sm hover:bg-[rgba(102,0,51,0.15)] transition-all"
            >
              <Archive size={18} />
              Archive
            </button>
          )}

          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[rgba(220,53,69,0.1)] text-[#dc3545] rounded-xl font-semibold text-sm hover:bg-[rgba(220,53,69,0.15)] transition-all"
          >
            <Trash2 size={18} />
            Delete
          </button>
        </div>
      </div>

      {/* Create Contract CTA */}
      <div
        className="rounded-[20px] p-7"
        style={{ background: 'rgba(255, 255, 255, 0.6)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: proposal.contractId ? 'rgba(40, 167, 69, 0.15)' : 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
          >
            <FileText size={24} className={proposal.contractId ? 'text-[#28a745]' : 'text-[#F7E6CA]'} />
          </div>
          <div className="flex-1">
            {proposal.contractId ? (
              <>
                <h2 className="text-lg font-bold text-[#660033]">Contract Created</h2>
                <p className="text-sm text-[rgba(102,0,51,0.6)]">
                  A contract has been created from this proposal. View it to continue editing or send for signature.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-[#660033]">Ready to make it official?</h2>
                <p className="text-sm text-[rgba(102,0,51,0.6)]">
                  Create a contract from this proposal to formalize the agreement.
                </p>
              </>
            )}
          </div>
          {proposal.contractId ? (
            <button
              onClick={() => onViewContract(proposal.contractId!)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#28a745] text-white rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_rgba(40,167,69,0.3)] transition-all"
            >
              <ExternalLink size={18} />
              View Contract
            </button>
          ) : (
            <button
              onClick={onCreateContract}
              className="px-6 py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all"
            >
              Create Contract
            </button>
          )}
        </div>
      </div>

      {/* Timeline (optional) */}
      {(proposal.viewedAt || proposal.respondedAt) && (
        <div
          className="rounded-[20px] p-7"
          style={{ background: 'rgba(255, 255, 255, 0.6)' }}
        >
          <h2 className="text-lg font-bold text-[#660033] mb-4">Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-[#660033]" />
              <span className="text-[rgba(102,0,51,0.6)]">Received</span>
              <span className="text-[#660033] font-medium">{formatDate(proposal.createdAt)}</span>
            </div>
            {proposal.viewedAt && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-[rgba(102,0,51,0.4)]" />
                <span className="text-[rgba(102,0,51,0.6)]">Viewed</span>
                <span className="text-[#660033] font-medium">{formatDate(proposal.viewedAt)}</span>
              </div>
            )}
            {proposal.respondedAt && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-[#28a745]" />
                <span className="text-[rgba(102,0,51,0.6)]">Responded</span>
                <span className="text-[#660033] font-medium">{formatDate(proposal.respondedAt)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
