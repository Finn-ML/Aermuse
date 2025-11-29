# Story 2.6: Legal Disclaimer

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 2.6 |
| **Epic** | Epic 2: AI Attorney - Real AI |
| **Title** | Legal Disclaimer |
| **Priority** | P0 - Critical |
| **Story Points** | 1 |
| **Status** | Drafted |

## User Story

**As a** platform operator
**I want** to display a legal disclaimer
**So that** users understand AI suggestions are not legal advice

## Context

Legal disclaimer is critical for platform liability protection. Users must clearly understand that AI analysis is for informational purposes only and does not constitute legal advice. The disclaimer must be prominently displayed on all analysis results and included in any exported content.

**Dependencies:**
- Story 2.4 (Summary Generation) should be completed first

## Acceptance Criteria

- [ ] **AC-1:** Disclaimer banner shown at top of all AI analysis results
- [ ] **AC-2:** Banner text: "AI suggestions do not constitute legal advice"
- [ ] **AC-3:** Link to full terms of service from disclaimer
- [ ] **AC-4:** Disclaimer cannot be permanently dismissed
- [ ] **AC-5:** Disclaimer included in footer of any exported/shared analysis
- [ ] **AC-6:** Consistent styling across all analysis pages
- [ ] **AC-7:** Mobile-responsive disclaimer design

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/components/contracts/LegalDisclaimer.tsx` | New: Disclaimer component |
| `client/src/components/contracts/LegalDisclaimerBanner.tsx` | New: Banner variant |
| `client/src/components/contracts/LegalDisclaimerFooter.tsx` | New: Footer variant (for exports) |
| `client/src/pages/ContractView.tsx` | Add disclaimer banner |
| `client/src/pages/Terms.tsx` | Ensure terms page exists |

### Implementation Details

#### 1. Legal Disclaimer Banner Component

```tsx
// client/src/components/contracts/LegalDisclaimer.tsx
import { AlertCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  className?: string;
  variant?: 'banner' | 'compact' | 'footer';
  expandable?: boolean;
}

const DISCLAIMER_SHORT = `This AI analysis is for informational purposes only and does not constitute legal advice.`;

const DISCLAIMER_FULL = `This AI-powered contract analysis is provided for informational and educational purposes only.
It does not constitute legal advice, and should not be relied upon as a substitute for consultation with a qualified
attorney. The analysis may not identify all issues in a contract, and interpretations may vary.

By using this feature, you acknowledge that:
• The AI may make errors or miss important issues
• Contract law varies by jurisdiction and specific circumstances
• Only a licensed attorney can provide legal advice
• You should consult a legal professional before making decisions based on this analysis

Aermuse Ltd and its affiliates disclaim all liability for actions taken or not taken based on this analysis.`;

export function LegalDisclaimer({ className = '', variant = 'banner', expandable = true }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (variant === 'compact') {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        <AlertCircle className="inline h-3 w-3 mr-1" />
        {DISCLAIMER_SHORT}
        <Link to="/terms" className="ml-1 text-burgundy hover:underline">
          Terms
        </Link>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`border-t pt-4 mt-6 ${className}`}>
        <div className="flex items-start gap-2 text-xs text-gray-500">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p>{DISCLAIMER_SHORT}</p>
            <Link to="/terms" className="text-burgundy hover:underline">
              View full terms of service
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Banner variant (default)
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-blue-800 font-medium">
                AI Analysis Disclaimer
              </p>
              {expandable && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                >
                  {expanded ? (
                    <>Less <ChevronUp className="h-4 w-4" /></>
                  ) : (
                    <>More <ChevronDown className="h-4 w-4" /></>
                  )}
                </button>
              )}
            </div>
            <p className="text-sm text-blue-700 mt-1">
              {DISCLAIMER_SHORT}
            </p>

            {expanded && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-sm text-blue-700 whitespace-pre-line">
                  {DISCLAIMER_FULL}
                </p>
              </div>
            )}

            <div className="mt-2 flex items-center gap-4 text-sm">
              <Link
                to="/terms"
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Terms of Service
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 2. Analysis Page Integration

```tsx
// client/src/pages/ContractView.tsx - Updated
import { LegalDisclaimer } from '../components/contracts/LegalDisclaimer';

export default function ContractView() {
  // ... existing code

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Contract Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
      </div>

      {/* Legal Disclaimer - Always at top when analysis exists */}
      {(displayAnalysis || isAnalyzing) && (
        <LegalDisclaimer className="mb-6" />
      )}

      {/* Analysis Content */}
      {/* ... rest of content */}

      {/* Disclaimer footer at bottom of analysis */}
      {displayAnalysis && (
        <LegalDisclaimer variant="footer" className="mt-8" />
      )}
    </div>
  );
}
```

#### 3. Export/Print Disclaimer

```tsx
// client/src/components/contracts/AnalysisExport.tsx
import { LegalDisclaimer } from './LegalDisclaimer';

interface Props {
  analysis: ContractAnalysis;
  contractTitle: string;
}

export function AnalysisExport({ analysis, contractTitle }: Props) {
  return (
    <div className="print-container">
      {/* Header */}
      <div className="mb-6 pb-4 border-b">
        <h1 className="text-2xl font-bold">{contractTitle}</h1>
        <p className="text-gray-500">
          AI Contract Analysis - Generated {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Disclaimer at top */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <p className="text-sm font-medium">Important Notice</p>
        <p className="text-sm text-gray-600 mt-1">
          This AI analysis is for informational purposes only and does not
          constitute legal advice. Please consult a qualified attorney before
          making decisions based on this analysis.
        </p>
      </div>

      {/* Analysis Content */}
      {/* ... summary, flags, etc */}

      {/* Disclaimer at bottom */}
      <div className="mt-8 pt-4 border-t text-xs text-gray-500">
        <p>
          Generated by Aermuse AI Attorney. This analysis does not constitute
          legal advice. See aermuse.com/terms for full terms of service.
        </p>
        <p className="mt-1">
          © {new Date().getFullYear()} Aermuse Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
```

#### 4. Terms of Service Page (stub)

```tsx
// client/src/pages/Terms.tsx
export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

      <div className="prose prose-sm max-w-none">
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
          <li>The analysis is based on general patterns and may not account for your specific situation</li>
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
          <li>You are responsible for your own legal and business decisions</li>
        </ul>

        <h3>Limitation of Liability</h3>
        <p>
          Aermuse Ltd and its affiliates disclaim all liability for actions
          taken or not taken based on the AI analysis. We provide this tool
          as-is without warranties of any kind.
        </p>

        {/* Additional terms sections would go here */}
      </div>
    </div>
  );
}
```

#### 5. Route Registration

```tsx
// client/src/App.tsx
import Terms from './pages/Terms';

// Add route
<Route path="/terms" element={<Terms />} />
```

## Definition of Done

- [ ] LegalDisclaimer component created with all variants
- [ ] Banner shows at top of all analysis pages
- [ ] Expandable details for full disclaimer text
- [ ] Link to Terms of Service works
- [ ] Footer disclaimer for exports
- [ ] Terms page exists with AI disclaimer section
- [ ] Disclaimer is not dismissable
- [ ] Mobile-responsive design

## Testing Checklist

### Unit Tests

- [ ] LegalDisclaimer renders all variants
- [ ] Expand/collapse works correctly
- [ ] Terms link points to correct route

### Integration Tests

- [ ] Disclaimer appears on contract view
- [ ] Disclaimer persists across navigation

### E2E Tests

- [ ] View analysis → See disclaimer
- [ ] Click "More" → See full text
- [ ] Click Terms link → Navigate to Terms page
- [ ] Refresh page → Disclaimer still visible

## Legal Review Checklist

Before launch, have legal counsel review:

- [ ] Disclaimer language is legally sufficient
- [ ] Terms of Service are complete
- [ ] Limitation of liability is properly stated
- [ ] Jurisdictional considerations addressed
- [ ] GDPR/privacy implications covered

## Accessibility

- [ ] Screen reader can read disclaimer
- [ ] Expandable section is keyboard accessible
- [ ] Color contrast meets WCAG AA
- [ ] Link has focus indicator

## Related Documents

- [Epic 2 Tech Spec](./tech-spec-epic-2.md)
- [Story 2.4: Summary Generation](./2-4-ai-contract-summary-generation.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create LegalDisclaimer component**
  - [ ] Create `client/src/components/contracts/LegalDisclaimer.tsx`
  - [ ] Implement banner variant (default)
  - [ ] Implement compact variant
  - [ ] Implement footer variant
  - [ ] Add expandable full text
  - [ ] Include Terms of Service link
  - [ ] Make non-dismissable

- [ ] **Task 2: Create Terms page**
  - [ ] Create `client/src/pages/Terms.tsx`
  - [ ] Add AI Analysis Disclaimer section
  - [ ] Add Limitations of AI Analysis section
  - [ ] Add Your Responsibilities section
  - [ ] Add Limitation of Liability section
  - [ ] Style with prose typography

- [ ] **Task 3: Add route**
  - [ ] Add /terms route to App.tsx
  - [ ] Ensure publicly accessible

- [ ] **Task 4: Integrate with ContractView**
  - [ ] Add banner disclaimer at top of analysis
  - [ ] Add footer disclaimer at bottom
  - [ ] Show only when analysis exists or is loading

- [ ] **Task 5: Create AnalysisExport component**
  - [ ] Create `client/src/components/contracts/AnalysisExport.tsx`
  - [ ] Include disclaimer at top of export
  - [ ] Include disclaimer at bottom of export
  - [ ] Format for print/PDF

- [ ] **Task 6: Write tests**
  - [ ] Unit tests for all disclaimer variants
  - [ ] Unit tests for expand/collapse
  - [ ] Integration tests for Terms link
  - [ ] E2E test for viewing disclaimer on analysis

- [ ] **Task 7: Accessibility review**
  - [ ] Verify screen reader accessibility
  - [ ] Test keyboard navigation
  - [ ] Check color contrast
  - [ ] Add focus indicators

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
