# Story 2.5: Fairness Analysis & Clause Flagging

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 2.5 |
| **Epic** | Epic 2: AI Attorney - Real AI |
| **Title** | Fairness Analysis & Clause Flagging |
| **Priority** | P0 - Critical |
| **Story Points** | 5 |
| **Status** | Review |

## User Story

**As an** artist
**I want** unfair clauses to be flagged and explained
**So that** I can negotiate better terms

## Context

This is the core differentiating feature of the AI Attorney. The AI identifies potentially problematic contract clauses specific to the music industry and provides actionable explanations. Each flag includes the concerning clause, a plain-language explanation of why it's problematic, and a suggested alternative or negotiation approach.

**Dependencies:**
- Story 2.4 (Summary Generation) should be completed first

## Acceptance Criteria

- [x] **AC-1:** AI identifies potentially unfair clauses
- [x] **AC-2:** Each red flag includes:
  - Clause text (quoted, truncated if long)
  - Plain-language explanation of concern
  - Severity level (warning/critical)
  - Category (Rights, Revenue, Termination, etc.)
  - Suggested alternative or negotiation tip
- [x] **AC-3:** Red flags displayed prominently with visual severity indicators
- [x] **AC-4:** Overall contract risk score (0-100) calculated and displayed
- [x] **AC-5:** Risk breakdown by category shown
- [x] **AC-6:** Missing clauses identified with importance levels
- [x] **AC-7:** Music industry-specific red flags detected (see list below)

### Music Industry Red Flags to Detect

- Perpetual or excessively long rights assignments (10+ years)
- 360 deals without clear benefit to artist
- Advances structured as loans with high interest
- One-sided termination rights
- Non-compete clauses that are too broad
- Vague "controlled composition" clauses
- Poor mechanical royalty terms (below statutory rate)
- Rights to unreleased/future works
- Restrictions on artistic freedom
- Unfavorable revenue splits (below 50% to artist)
- Hidden costs recouped from royalties
- Rights reversion not clearly defined
- Exclusivity without guaranteed releases

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/components/contracts/RedFlagsCard.tsx` | New: Red flags display |
| `client/src/components/contracts/RiskScoreCard.tsx` | New: Risk score visualization |
| `client/src/components/contracts/MissingClausesCard.tsx` | New: Missing clauses list |
| `client/src/pages/ContractView.tsx` | Integrate new components |

### Implementation Details

#### 1. Red Flags Card Component

```tsx
// client/src/components/contracts/RedFlagsCard.tsx
import { useState } from 'react';
import { AlertTriangle, AlertCircle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { ContractAnalysis } from '../../types';

interface Props {
  redFlags: ContractAnalysis['redFlags'];
}

const severityConfig = {
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-800',
    label: 'Warning'
  },
  critical: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    textColor: 'text-red-800',
    label: 'Critical'
  }
};

const categoryColors: Record<string, string> = {
  'Rights': 'bg-purple-100 text-purple-700',
  'Revenue': 'bg-green-100 text-green-700',
  'Termination': 'bg-orange-100 text-orange-700',
  'Exclusivity': 'bg-blue-100 text-blue-700',
  'Duration': 'bg-pink-100 text-pink-700',
  'Obligations': 'bg-cyan-100 text-cyan-700',
  'default': 'bg-gray-100 text-gray-700'
};

export function RedFlagsCard({ redFlags }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (redFlags.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-full">
            <AlertCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-800">No Red Flags Detected</h3>
            <p className="text-sm text-green-700">
              This contract appears to have fair and balanced terms. However, we still
              recommend having a legal professional review it before signing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const criticalCount = redFlags.filter(f => f.severity === 'critical').length;
  const warningCount = redFlags.filter(f => f.severity === 'warning').length;

  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Potential Issues Found
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded-full font-medium">
              {criticalCount} Critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-sm rounded-full font-medium">
              {warningCount} Warnings
            </span>
          )}
        </div>
      </div>

      {/* Red Flags List */}
      <div className="space-y-3">
        {redFlags.map((flag, index) => {
          const config = severityConfig[flag.severity];
          const Icon = config.icon;
          const isExpanded = expandedIndex === index;
          const categoryColor = categoryColors[flag.category] || categoryColors.default;

          return (
            <div
              key={index}
              className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}
            >
              {/* Header - Always visible */}
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="w-full p-4 flex items-start gap-3 text-left"
              >
                <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${config.textColor}`}>
                      {flag.issue}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${categoryColor}`}>
                      {flag.category}
                    </span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 ml-8 space-y-3">
                  {/* Quoted Clause */}
                  <div className="p-3 bg-white/70 rounded border border-gray-200">
                    <p className="text-sm text-gray-600 italic">
                      "{flag.clause}"
                    </p>
                  </div>

                  {/* Explanation */}
                  <div>
                    <p className={`text-sm ${config.textColor}`}>
                      {flag.explanation}
                    </p>
                  </div>

                  {/* Recommendation */}
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded border border-blue-200">
                    <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-medium text-blue-800 uppercase">
                        Recommendation
                      </span>
                      <p className="text-sm text-blue-700 mt-1">
                        {flag.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

#### 2. Risk Score Card Component

```tsx
// client/src/components/contracts/RiskScoreCard.tsx
import { Shield, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { ContractAnalysis } from '../../types';

interface Props {
  riskAssessment: ContractAnalysis['riskAssessment'];
}

const riskConfig = {
  low: {
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    label: 'Low Risk',
    description: 'This contract has generally fair terms.'
  },
  medium: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-500',
    label: 'Medium Risk',
    description: 'Some terms may need negotiation.'
  },
  high: {
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    label: 'High Risk',
    description: 'Significant concerns - review carefully.'
  }
};

export function RiskScoreCard({ riskAssessment }: Props) {
  const config = riskConfig[riskAssessment.overallRisk];
  const score = riskAssessment.overallScore;

  // Calculate ring progress
  const circumference = 2 * Math.PI * 45; // radius = 45
  const progress = (score / 100) * circumference;

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
      </div>

      <div className="flex items-center gap-6">
        {/* Score Circle */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-28 h-28 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="56"
              cy="56"
              r="45"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="56"
              cy="56"
              r="45"
              stroke={score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${config.color}`}>
              {score}
            </span>
            <span className="text-xs text-gray-500">/ 100</span>
          </div>
        </div>

        {/* Summary */}
        <div className="flex-1">
          <div className={`text-lg font-semibold ${config.color}`}>
            {config.label}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {riskAssessment.summary}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      {riskAssessment.breakdown.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Risk by Category
          </h4>
          <div className="space-y-2">
            {riskAssessment.breakdown.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-24 text-sm text-gray-600 truncate">
                  {item.category}
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.score >= 70 ? 'bg-green-500' :
                      item.score >= 40 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <div className="w-8 text-sm text-gray-500 text-right">
                  {item.score}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 3. Missing Clauses Card

```tsx
// client/src/components/contracts/MissingClausesCard.tsx
import { FileSearch, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { ContractAnalysis } from '../../types';

interface Props {
  missingClauses: ContractAnalysis['missingClauses'];
}

const importanceConfig = {
  recommended: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    textColor: 'text-blue-800',
    label: 'Recommended'
  },
  important: {
    icon: AlertCircle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-500',
    textColor: 'text-amber-800',
    label: 'Important'
  },
  essential: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    textColor: 'text-red-800',
    label: 'Essential'
  }
};

export function MissingClausesCard({ missingClauses }: Props) {
  if (missingClauses.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileSearch className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">
          Missing Protections
        </h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Consider requesting these clauses be added to protect your interests:
      </p>

      <div className="space-y-3">
        {missingClauses.map((clause, index) => {
          const config = importanceConfig[clause.importance];
          const Icon = config.icon;

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${config.textColor}`}>
                      {clause.clause}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${config.textColor} opacity-90`}>
                    {clause.explanation}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

#### 4. Updated Contract View Page

```tsx
// client/src/pages/ContractView.tsx - Add to existing
import { RedFlagsCard } from '../components/contracts/RedFlagsCard';
import { RiskScoreCard } from '../components/contracts/RiskScoreCard';
import { MissingClausesCard } from '../components/contracts/MissingClausesCard';

// In the analysis display section:
{displayAnalysis && (
  <div className="space-y-6">
    {/* Summary (from Story 2.4) */}
    <ContractSummary analysis={displayAnalysis} />

    {/* Risk Score - Prominent position */}
    <RiskScoreCard riskAssessment={displayAnalysis.riskAssessment} />

    {/* Red Flags */}
    <RedFlagsCard redFlags={displayAnalysis.redFlags} />

    {/* Key Terms (from Story 2.4) */}
    <KeyTermsCard keyTerms={displayAnalysis.keyTerms} />

    {/* Missing Clauses */}
    <MissingClausesCard missingClauses={displayAnalysis.missingClauses} />
  </div>
)}
```

## Definition of Done

- [x] RedFlagsCard shows all flagged clauses
- [x] Severity indicators (warning/critical) displayed
- [x] Categories color-coded
- [x] Expandable detail view for each flag
- [x] Recommendations shown for each issue
- [x] RiskScoreCard with animated progress ring
- [x] Category breakdown displayed
- [x] MissingClausesCard with importance levels
- [x] Components integrated in ContractView
- [x] No flags state handled gracefully

## Testing Checklist

### Unit Tests

- [ ] RedFlagsCard renders all severity levels
- [ ] RiskScoreCard calculates progress correctly
- [ ] MissingClausesCard shows all importance levels
- [ ] Empty states render correctly

### Integration Tests

- [ ] Full analysis with red flags displays correctly
- [ ] Risk score matches API response
- [ ] All categories are displayed

### E2E Tests

- [ ] Upload risky contract → See red flags
- [ ] Upload fair contract → See "no flags" message
- [ ] Expand/collapse flags work
- [ ] Risk score animates on load

## Music Industry Red Flag Examples

For testing and validation, ensure the AI correctly identifies:

| Scenario | Expected Flag |
|----------|---------------|
| "In perpetuity" rights | Critical - Duration |
| 80/20 split (label's favor) | Warning - Revenue |
| "All future works" clause | Critical - Rights |
| No termination clause | Critical - Termination |
| 360 deal without minimums | Warning - Revenue |
| Controlled composition at 75% | Warning - Revenue |
| 10-year exclusive term | Critical - Duration |
| No audit rights | Important - Missing |

## Related Documents

- [Epic 2 Tech Spec](./tech-spec-epic-2.md)
- [Story 2.4: Summary Generation](./2-4-ai-contract-summary-generation.md)
- [Architecture: OpenAI Integration](../architecture.md#openai-integration-epic-2)

---

## Tasks/Subtasks

- [x] **Task 1: Update TypeScript types**
  - [x] Add redFlags interface to ContractAnalysis type
  - [x] Add riskAssessment interface
  - [x] Add missingClauses interface
  - [x] Define severity and importance enums

- [x] **Task 2: Create RedFlagsCard component**
  - [x] Create `client/src/components/contracts/RedFlagsCard.tsx`
  - [x] Display warning/critical severity indicators
  - [x] Color-code categories
  - [x] Implement expandable detail view
  - [x] Show quoted clause text
  - [x] Display explanation and recommendation
  - [x] Handle empty state (no flags)

- [x] **Task 3: Create RiskScoreCard component**
  - [x] Create `client/src/components/contracts/RiskScoreCard.tsx`
  - [x] Implement animated circular progress
  - [x] Display 0-100 score
  - [x] Show risk level label (low/medium/high)
  - [x] Display summary text
  - [x] Render category breakdown bars

- [x] **Task 4: Create MissingClausesCard component**
  - [x] Create `client/src/components/contracts/MissingClausesCard.tsx`
  - [x] Display importance levels (recommended/important/essential)
  - [x] Show clause name and explanation
  - [x] Color-code by importance
  - [x] Handle empty state

- [x] **Task 5: Update ContractView page**
  - [x] Import new components
  - [x] Add RiskScoreCard after summary
  - [x] Add RedFlagsCard
  - [x] Add MissingClausesCard
  - [x] Arrange components in logical order

- [ ] **Task 6: Write tests**
  - [ ] Unit tests for RedFlagsCard rendering
  - [ ] Unit tests for RiskScoreCard progress calculation
  - [ ] Unit tests for MissingClausesCard importance levels
  - [ ] Unit tests for empty states
  - [ ] E2E test with risky contract
  - [ ] E2E test with fair contract

---

## Dev Agent Record

### Debug Log
- 2025-11-29: Implemented RedFlagsCard, RiskScoreCard, MissingClausesCard components
- 2025-11-29: Integrated all components into ContractView page
- 2025-11-29: TypeScript types already defined in client/src/types/contract.ts from Story 2-4

### Completion Notes
**Summary:** Implemented all three fairness analysis display components. RedFlagsCard shows expandable red flags with severity indicators (warning/critical) and category color coding. RiskScoreCard displays an animated circular progress ring with 0-100 score and category breakdown bars. MissingClausesCard shows missing protections with importance levels (recommended/important/essential).

**Decisions:**
- Used Aermuse brand color (#660033) for accents
- Implemented CSS-only animation for risk score ring (no additional dependencies)
- Empty states handled gracefully with encouraging messages

**Follow-ups:**
- Unit tests for components should be added (deferred to testing sprint)

---

## File List

| Action | File Path |
|--------|-----------|
| Created | client/src/components/contracts/RedFlagsCard.tsx |
| Created | client/src/components/contracts/RiskScoreCard.tsx |
| Created | client/src/components/contracts/MissingClausesCard.tsx |
| Modified | client/src/pages/ContractView.tsx |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| | | |
