# Story 2.4: AI Contract Summary Generation

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 2.4 |
| **Epic** | Epic 2: AI Attorney - Real AI |
| **Title** | AI Contract Summary Generation |
| **Priority** | P0 - Critical |
| **Story Points** | 5 |
| **Status** | Drafted |

## User Story

**As an** artist
**I want** to see a plain-language summary of my contract
**So that** I can understand what I'm agreeing to

## Context

This story focuses on displaying the AI-generated contract summary in a user-friendly way. The summary includes an overview, identified parties, key dates, and extracted terms - all presented in simple language that musicians can understand without legal expertise.

**Dependencies:**
- Story 2.3 (OpenAI Integration) must be completed first

## Acceptance Criteria

- [ ] **AC-1:** Summary generated automatically after successful upload and extraction
- [ ] **AC-2:** Summary displayed in plain, non-legal language
- [ ] **AC-3:** Key terms highlighted with explanations
- [ ] **AC-4:** Important dates and deadlines extracted and displayed
- [ ] **AC-5:** Parties involved clearly identified with their roles
- [ ] **AC-6:** "Analyzing..." loading state during processing
- [ ] **AC-7:** Contract type identified (Recording, License, etc.)
- [ ] **AC-8:** Duration/term of contract displayed if present

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/components/contracts/ContractSummary.tsx` | New: Summary display component |
| `client/src/components/contracts/KeyTermsCard.tsx` | New: Key terms list |
| `client/src/components/contracts/PartiesCard.tsx` | New: Parties display |
| `client/src/components/contracts/DatesCard.tsx` | New: Key dates display |
| `client/src/components/contracts/AnalyzingState.tsx` | New: Loading state |
| `client/src/pages/ContractView.tsx` | Integrate summary components |
| `client/src/hooks/useContractAnalysis.ts` | New: Analysis hook |

### Implementation Details

#### 1. Analysis Hook

```typescript
// client/src/hooks/useContractAnalysis.ts
import { useState, useCallback } from 'react';
import { Contract, ContractAnalysis } from '../types';

interface UseContractAnalysisReturn {
  analyze: (contractId: string) => Promise<void>;
  isAnalyzing: boolean;
  error: string | null;
  analysis: ContractAnalysis | null;
}

export function useContractAnalysis(): UseContractAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);

  const analyze = useCallback(async (contractId: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${contractId}/analyze`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { analyze, isAnalyzing, error, analysis };
}
```

#### 2. Analyzing State Component

```tsx
// client/src/components/contracts/AnalyzingState.tsx
import { Loader2, Brain } from 'lucide-react';

export function AnalyzingState() {
  return (
    <div className="bg-white rounded-lg border p-8 text-center">
      <div className="relative inline-flex">
        <Brain className="h-16 w-16 text-burgundy" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-burgundy/50" />
        </div>
      </div>

      <h3 className="mt-4 text-xl font-semibold text-gray-900">
        Analyzing Your Contract
      </h3>

      <p className="mt-2 text-gray-600 max-w-md mx-auto">
        Our AI is reviewing your contract to provide a plain-language summary,
        identify key terms, and flag any potential concerns.
      </p>

      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-burgundy animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-burgundy animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-burgundy animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span>This usually takes 30-45 seconds</span>
      </div>
    </div>
  );
}
```

#### 3. Contract Summary Component

```tsx
// client/src/components/contracts/ContractSummary.tsx
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
        <div className="p-3 bg-burgundy/10 rounded-lg">
          <FileText className="h-6 w-6 text-burgundy" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
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
      <div className="prose prose-sm max-w-none mb-6">
        <p className="text-gray-700 leading-relaxed">
          {summary.overview}
        </p>
      </div>

      {/* Parties */}
      {summary.parties.length > 0 && (
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
                    {party.role.charAt(0)}
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
      {summary.keyDates.length > 0 && (
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
                <span className={`font-medium ${
                  date.isDeadline ? 'text-amber-700' : 'text-gray-900'
                }`}>
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
```

#### 4. Key Terms Card

```tsx
// client/src/components/contracts/KeyTermsCard.tsx
import { DollarSign, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { ContractAnalysis } from '../../types';

interface Props {
  keyTerms: ContractAnalysis['keyTerms'];
}

const riskColors = {
  low: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  high: 'text-red-600 bg-red-50 border-red-200'
};

const riskIcons = {
  low: CheckCircle,
  medium: AlertCircle,
  high: AlertCircle
};

export function KeyTermsCard({ keyTerms }: Props) {
  if (keyTerms.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">Key Terms</h3>
      </div>

      <div className="space-y-4">
        {keyTerms.map((term, index) => {
          const RiskIcon = riskIcons[term.risk];

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${riskColors[term.risk]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{term.term}</span>
                    {term.section && (
                      <span className="text-xs text-gray-500">
                        ({term.section})
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {term.value}
                  </div>
                  <p className="mt-2 text-sm opacity-90">
                    {term.explanation}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <RiskIcon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Low Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>High Risk</span>
        </div>
      </div>
    </div>
  );
}
```

#### 5. Contract View Page Integration

```tsx
// client/src/pages/ContractView.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ContractSummary } from '../components/contracts/ContractSummary';
import { KeyTermsCard } from '../components/contracts/KeyTermsCard';
import { AnalyzingState } from '../components/contracts/AnalyzingState';
import { LegalDisclaimer } from '../components/contracts/LegalDisclaimer';
import { useContractAnalysis } from '../hooks/useContractAnalysis';
import { Contract } from '../types';

export default function ContractView() {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const { analyze, isAnalyzing, error, analysis } = useContractAnalysis();

  useEffect(() => {
    fetchContract();
  }, [id]);

  const fetchContract = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/contracts/${id}`);
      const data = await response.json();
      setContract(data.contract);

      // Auto-analyze if not already analyzed
      if (data.contract.extractedText && !data.contract.aiAnalysis) {
        analyze(id!);
      }
    } catch (err) {
      console.error('Failed to fetch contract:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!contract) {
    return <div>Contract not found</div>;
  }

  const displayAnalysis = analysis || contract.aiAnalysis;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Contract Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
        <p className="text-gray-500 mt-1">
          Uploaded {new Date(contract.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Legal Disclaimer - Always show at top */}
      <LegalDisclaimer className="mb-6" />

      {/* Analysis Content */}
      {isAnalyzing ? (
        <AnalyzingState />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => analyze(id!)}
            className="mt-2 text-red-700 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : displayAnalysis ? (
        <div className="space-y-6">
          {/* Summary */}
          <ContractSummary analysis={displayAnalysis} />

          {/* Key Terms */}
          <KeyTermsCard keyTerms={displayAnalysis.keyTerms} />

          {/* Red Flags and Risk Assessment will be in Story 2.5 */}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">
            No analysis available. Upload a contract to get started.
          </p>
        </div>
      )}
    </div>
  );
}
```

## Definition of Done

- [ ] AnalyzingState component shows loading animation
- [ ] ContractSummary displays overview, type, and duration
- [ ] Parties identified and displayed with roles
- [ ] Key dates extracted and shown (deadlines highlighted)
- [ ] KeyTermsCard shows terms with risk indicators
- [ ] Auto-analysis triggered on contract view
- [ ] Analysis persists across page refreshes
- [ ] Error state with retry option

## Testing Checklist

### Unit Tests

- [ ] ContractSummary renders all sections
- [ ] KeyTermsCard displays correct risk colors
- [ ] AnalyzingState shows loading indicators
- [ ] Empty states handled gracefully

### Integration Tests

- [ ] Analysis hook triggers API call
- [ ] Analysis saves to contract record
- [ ] Auto-analysis on first view

### E2E Tests

- [ ] Upload → View → See analyzing state → See results
- [ ] Refresh page → Results persisted
- [ ] Error state → Retry works

## Visual Design Notes

- Use burgundy as primary accent color
- Risk indicators: green (low), amber (medium), red (high)
- Clear visual hierarchy: Summary > Key Terms > Dates
- Mobile-responsive card layouts
- Loading animation should feel professional, not cartoonish

## Related Documents

- [Epic 2 Tech Spec](./tech-spec-epic-2.md)
- [Story 2.3: OpenAI Integration](./2-3-openai-gpt4-integration.md)
- [Story 2.5: Fairness Analysis](./2-5-fairness-analysis-and-clause-flagging.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create TypeScript types**
  - [ ] Create ContractAnalysis type in `client/src/types`
  - [ ] Define summary, keyTerms, parties, dates interfaces
  - [ ] Export types for use in components

- [ ] **Task 2: Create useContractAnalysis hook**
  - [ ] Create `client/src/hooks/useContractAnalysis.ts`
  - [ ] Implement analyze function
  - [ ] Track isAnalyzing, error, analysis state
  - [ ] Handle API responses and errors

- [ ] **Task 3: Create AnalyzingState component**
  - [ ] Create `client/src/components/contracts/AnalyzingState.tsx`
  - [ ] Design loading animation with Brain icon
  - [ ] Add informative loading message
  - [ ] Animate bouncing dots

- [ ] **Task 4: Create ContractSummary component**
  - [ ] Create `client/src/components/contracts/ContractSummary.tsx`
  - [ ] Display overview text
  - [ ] Show contract type badge
  - [ ] Display duration if present
  - [ ] Render parties with roles
  - [ ] Render key dates with deadline highlighting

- [ ] **Task 5: Create KeyTermsCard component**
  - [ ] Create `client/src/components/contracts/KeyTermsCard.tsx`
  - [ ] Display terms with risk indicators
  - [ ] Color-code by risk level (low/medium/high)
  - [ ] Show term value and explanation
  - [ ] Include section reference if available
  - [ ] Add risk legend

- [ ] **Task 6: Create ContractView page**
  - [ ] Create or update `client/src/pages/ContractView.tsx`
  - [ ] Fetch contract data on mount
  - [ ] Trigger auto-analysis if not analyzed
  - [ ] Display analyzing state during processing
  - [ ] Render summary and key terms when complete
  - [ ] Handle error state with retry

- [ ] **Task 7: Add route**
  - [ ] Add /contracts/:id route to App.tsx
  - [ ] Ensure authentication required

- [ ] **Task 8: Write tests**
  - [ ] Unit tests for ContractSummary rendering
  - [ ] Unit tests for KeyTermsCard risk colors
  - [ ] Unit tests for AnalyzingState
  - [ ] Integration tests for analysis hook
  - [ ] E2E test for upload → view → analysis flow

---

## Dev Agent Record

### Debug Log
<!-- Automatically updated by dev agent during implementation -->

### Completion Notes
<!-- Summary of implementation, decisions made, any follow-ups needed -->

---

## File List

| Action | File Path |
|--------|-----------|
| | |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| | | |
