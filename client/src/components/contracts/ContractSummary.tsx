import { FileText, Clock, Users, Calendar } from 'lucide-react';
import { ContractAnalysis } from '../../types';

interface Props {
  analysis: ContractAnalysis;
}

export function ContractSummary({ analysis }: Props) {
  const { summary } = analysis;

  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-[#660033]/10 rounded-lg">
          <FileText className="h-6 w-6 text-[#660033]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold text-gray-900">
              Contract Summary
            </h2>
            {summary.contractType && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-sm rounded">
                {summary.contractType}
              </span>
            )}
          </div>
          {summary.duration && (
            <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>Duration: {summary.duration}</span>
            </div>
          )}
        </div>
      </div>

      {/* Overview */}
      <div className="mb-6">
        <p className="text-gray-700 leading-relaxed">
          {summary.overview}
        </p>
      </div>

      {/* Parties */}
      {summary.parties && summary.parties.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-gray-400" />
            <h3 className="font-medium text-gray-900">Parties Involved</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {summary.parties.map((party, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {party.role.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {party.identified ? party.name : '(Not specified)'}
                  </div>
                  <div className="text-sm text-gray-500">{party.role}</div>
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
            <Calendar className="h-5 w-5 text-gray-400" />
            <h3 className="font-medium text-gray-900">Important Dates</h3>
          </div>
          <div className="space-y-2">
            {summary.keyDates.map((date, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  date.isDeadline
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-gray-50'
                }`}
              >
                <span className="text-gray-700">{date.description}</span>
                <span
                  className={`font-medium ${
                    date.isDeadline ? 'text-amber-700' : 'text-gray-900'
                  }`}
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
