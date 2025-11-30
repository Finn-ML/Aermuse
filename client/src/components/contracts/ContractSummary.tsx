import { FileText, Clock, Users, Calendar, Sparkles } from 'lucide-react';
import { ContractAnalysis } from '../../types';

interface Props {
  analysis: ContractAnalysis;
}

export function ContractSummary({ analysis }: Props) {
  const { summary } = analysis;

  return (
    <div
      className="rounded-[20px] p-7"
      style={{ background: 'rgba(255, 255, 255, 0.6)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
        >
          <FileText className="h-5 w-5 text-[#F7E6CA]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-[#660033]">
              Contract Summary
            </h2>
            {summary.contractType && (
              <span
                className="px-3 py-1 text-[11px] font-bold uppercase tracking-[0.05em] rounded-full"
                style={{
                  background: 'rgba(102, 0, 51, 0.1)',
                  color: '#660033'
                }}
              >
                {summary.contractType}
              </span>
            )}
          </div>
          {summary.duration && (
            <div className="flex items-center gap-2 mt-2 text-sm text-[rgba(102,0,51,0.6)]">
              <Clock className="h-4 w-4" />
              <span>Duration: <strong className="text-[#660033]">{summary.duration}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Overview */}
      <div
        className="mb-6 p-4 rounded-xl"
        style={{
          background: 'rgba(102, 0, 51, 0.05)',
          border: '1px solid rgba(102, 0, 51, 0.1)'
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-[#660033]" />
          <span className="text-[11px] font-bold text-[#660033] uppercase tracking-[0.05em]">AI Summary</span>
        </div>
        <p className="text-[rgba(102,0,51,0.8)] text-sm leading-relaxed">
          {summary.overview}
        </p>
      </div>

      {/* Parties */}
      {summary.parties && summary.parties.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-[rgba(102,0,51,0.5)]" />
            <h3 className="font-semibold text-[#660033] text-sm">Parties Involved</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {summary.parties.map((party, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-xl transition-all duration-300 hover:shadow-[0_4px_12px_rgba(102,0,51,0.08)]"
                style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(102, 0, 51, 0.08)'
                }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                >
                  <span className="text-sm font-bold text-[#F7E6CA]">
                    {party.role.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-[#660033] text-sm">
                    {party.identified ? party.name : '(Not specified)'}
                  </div>
                  <div className="text-xs text-[rgba(102,0,51,0.5)]">{party.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Dates */}
      {summary.keyDates && summary.keyDates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-[rgba(102,0,51,0.5)]" />
            <h3 className="font-semibold text-[#660033] text-sm">Important Dates</h3>
          </div>
          <div className="space-y-2">
            {summary.keyDates.map((date, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl transition-all duration-300"
                style={{
                  background: date.isDeadline
                    ? 'rgba(212, 175, 55, 0.15)'
                    : 'rgba(255, 255, 255, 0.6)',
                  border: date.isDeadline
                    ? '1px solid rgba(212, 175, 55, 0.3)'
                    : '1px solid rgba(102, 0, 51, 0.08)',
                }}
              >
                <span className="text-[rgba(102,0,51,0.8)] text-sm">{date.description}</span>
                <span
                  className="font-semibold text-sm px-2 py-0.5 rounded-lg"
                  style={{
                    background: date.isDeadline
                      ? 'rgba(212, 175, 55, 0.2)'
                      : 'rgba(102, 0, 51, 0.08)',
                    color: date.isDeadline ? '#B8860B' : '#660033'
                  }}
                >
                  {date.date || 'Not specified'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
