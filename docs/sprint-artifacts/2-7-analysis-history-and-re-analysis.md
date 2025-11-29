# Story 2.7: Analysis History & Re-analysis

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 2.7 |
| **Epic** | Epic 2: AI Attorney - Real AI |
| **Title** | Analysis History & Re-analysis |
| **Priority** | P1 - High |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As an** artist
**I want** to see previous analyses and request re-analysis
**So that** I can track changes or get updated insights

## Context

Users may want to re-analyze a contract after the AI model improves, or to get a fresh perspective. This story adds the ability to trigger a new analysis and displays when the analysis was last performed. For MVP, we store only the latest analysis; version history is a future enhancement.

**Dependencies:**
- Story 2.3 (OpenAI Integration) must be completed first

## Acceptance Criteria

- [ ] **AC-1:** Analysis timestamp displayed on results page
- [ ] **AC-2:** "Re-analyze" button available on analyzed contracts
- [ ] **AC-3:** Confirmation dialog before re-analysis (warns about API usage)
- [ ] **AC-4:** Analysis version number incremented on each re-analysis
- [ ] **AC-5:** Loading state shown during re-analysis
- [ ] **AC-6:** Previous analysis visible until new one completes
- [ ] **AC-7:** Rate limiting applies to re-analysis requests

## Technical Requirements

### Database Schema (Already Exists)

```typescript
// shared/schema.ts - From Epic 2 tech spec
analyzedAt: timestamp("analyzed_at"),
analysisVersion: integer("analysis_version").default(1),
```

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/components/contracts/AnalysisMetadata.tsx` | New: Timestamp and version display |
| `client/src/components/contracts/ReanalyzeButton.tsx` | New: Re-analyze trigger |
| `client/src/components/contracts/ReanalyzeConfirmModal.tsx` | New: Confirmation dialog |
| `client/src/pages/ContractView.tsx` | Integrate new components |
| `server/routes/contracts.ts` | Add reanalyze endpoint |

### Implementation Details

#### 1. Re-analyze Endpoint

```typescript
// server/routes/contracts.ts

// POST /api/contracts/:id/reanalyze
app.post('/api/contracts/:id/reanalyze',
  requireAuth,
  aiLimiter,  // Same rate limit as initial analysis
  async (req, res) => {
    const contract = await db.query.contracts.findFirst({
      where: and(
        eq(contracts.id, req.params.id),
        eq(contracts.userId, req.session.userId)
      )
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (!contract.extractedText) {
      return res.status(400).json({
        error: 'No text available for analysis.'
      });
    }

    if (!contract.aiAnalysis) {
      return res.status(400).json({
        error: 'Contract has not been analyzed yet. Use the analyze endpoint.'
      });
    }

    try {
      // Store previous version number for reference
      const previousVersion = contract.analysisVersion || 1;

      // Update status
      await db.update(contracts)
        .set({ status: 'analyzing' })
        .where(eq(contracts.id, contract.id));

      // Truncate if needed
      const { text, truncated } = truncateForAI(contract.extractedText);

      // Perform analysis
      const result = await analyzeContract(text);

      // Add metadata
      const analysis = {
        ...result.analysis,
        metadata: {
          modelVersion: result.model,
          analyzedAt: new Date().toISOString(),
          processingTime: result.processingTime,
          tokenCount: result.usage.totalTokens,
          truncated,
          previousVersion
        }
      };

      // Save new analysis, increment version
      const [updated] = await db.update(contracts)
        .set({
          aiAnalysis: analysis,
          analyzedAt: new Date(),
          analysisVersion: previousVersion + 1,
          status: 'analyzed'
        })
        .where(eq(contracts.id, contract.id))
        .returning();

      console.log(`[AI] Contract ${contract.id} re-analyzed: v${previousVersion} → v${previousVersion + 1}`);

      res.json({
        contract: updated,
        analysis,
        previousVersion,
        newVersion: previousVersion + 1
      });
    } catch (error) {
      console.error(`[AI] Re-analysis failed for ${contract.id}:`, error);

      // Reset status but keep previous analysis
      await db.update(contracts)
        .set({ status: 'analyzed' })
        .where(eq(contracts.id, contract.id));

      if (error instanceof OpenAIError) {
        return res.status(500).json({
          error: error.message,
          code: error.code
        });
      }

      res.status(500).json({
        error: 'Re-analysis failed. Your previous analysis is still available.',
        code: 'REANALYSIS_FAILED'
      });
    }
  }
);
```

#### 2. Analysis Metadata Component

```tsx
// client/src/components/contracts/AnalysisMetadata.tsx
import { Clock, RefreshCw, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  analyzedAt: string;
  version: number;
  modelVersion?: string;
  processingTime?: number;
  tokenCount?: number;
}

export function AnalysisMetadata({
  analyzedAt,
  version,
  modelVersion,
  processingTime,
  tokenCount
}: Props) {
  const date = new Date(analyzedAt);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4" />
        <span>Analyzed {timeAgo}</span>
      </div>

      <div className="flex items-center gap-1">
        <RefreshCw className="h-4 w-4" />
        <span>Version {version}</span>
      </div>

      {modelVersion && (
        <div className="flex items-center gap-1">
          <Sparkles className="h-4 w-4" />
          <span>{modelVersion}</span>
        </div>
      )}

      {processingTime && (
        <span className="text-gray-400">
          {(processingTime / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
}
```

#### 3. Re-analyze Button Component

```tsx
// client/src/components/contracts/ReanalyzeButton.tsx
import { RefreshCw, Loader2 } from 'lucide-react';

interface Props {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ReanalyzeButton({ onClick, isLoading, disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`
        flex items-center gap-2 px-4 py-2 border rounded-md
        transition-colors
        ${isLoading || disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
        }
      `}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Analyzing...</span>
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          <span>Re-analyze</span>
        </>
      )}
    </button>
  );
}
```

#### 4. Confirmation Modal

```tsx
// client/src/components/contracts/ReanalyzeConfirmModal.tsx
import { AlertCircle, X, RefreshCw } from 'lucide-react';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
  analysisCount?: number;
  rateLimit?: { remaining: number; resetIn: string };
}

export function ReanalyzeConfirmModal({
  onConfirm,
  onCancel,
  analysisCount,
  rateLimit
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-burgundy" />
            <h2 className="text-lg font-semibold">Re-analyze Contract?</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 space-y-3">
          <p className="text-gray-600">
            Running a new analysis will replace your current results. This action
            uses one of your hourly analysis credits.
          </p>

          {rateLimit && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-800 font-medium">
                  {rateLimit.remaining} analyses remaining
                </p>
                <p className="text-amber-700">
                  Limit resets {rateLimit.resetIn}
                </p>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-500">
            <p>Re-analysis may provide different results because:</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>AI models are continuously improved</li>
              <li>Analysis can vary slightly between runs</li>
              <li>New patterns may be detected</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-burgundy text-white rounded-md hover:bg-burgundy-dark"
          >
            Re-analyze
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 5. Updated Contract View Page

```tsx
// client/src/pages/ContractView.tsx - Updated
import { useState } from 'react';
import { AnalysisMetadata } from '../components/contracts/AnalysisMetadata';
import { ReanalyzeButton } from '../components/contracts/ReanalyzeButton';
import { ReanalyzeConfirmModal } from '../components/contracts/ReanalyzeConfirmModal';

export default function ContractView() {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [showReanalyzeModal, setShowReanalyzeModal] = useState(false);
  const { analyze, isAnalyzing, error, analysis } = useContractAnalysis();

  // ... existing code

  const handleReanalyze = async () => {
    setShowReanalyzeModal(false);
    await reanalyze(id!);
  };

  const reanalyze = async (contractId: string) => {
    try {
      const response = await fetch(`/api/contracts/${contractId}/reanalyze`, {
        method: 'POST'
      });
      const data = await response.json();

      if (response.ok) {
        setContract(data.contract);
      } else {
        // Handle error - show toast or inline message
        console.error('Re-analysis failed:', data.error);
      }
    } catch (err) {
      console.error('Re-analysis request failed:', err);
    }
  };

  const displayAnalysis = analysis || contract?.aiAnalysis;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header with actions */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{contract?.title}</h1>
          {displayAnalysis?.metadata && (
            <AnalysisMetadata
              analyzedAt={displayAnalysis.metadata.analyzedAt}
              version={contract?.analysisVersion || 1}
              modelVersion={displayAnalysis.metadata.modelVersion}
              processingTime={displayAnalysis.metadata.processingTime}
            />
          )}
        </div>

        {displayAnalysis && !isAnalyzing && (
          <ReanalyzeButton
            onClick={() => setShowReanalyzeModal(true)}
            isLoading={isAnalyzing}
          />
        )}
      </div>

      {/* ... rest of content */}

      {/* Re-analyze Confirmation Modal */}
      {showReanalyzeModal && (
        <ReanalyzeConfirmModal
          onConfirm={handleReanalyze}
          onCancel={() => setShowReanalyzeModal(false)}
        />
      )}
    </div>
  );
}
```

#### 6. Analysis Hook Update

```typescript
// client/src/hooks/useContractAnalysis.ts - Add reanalyze function
export function useContractAnalysis(): UseContractAnalysisReturn {
  // ... existing code

  const reanalyze = useCallback(async (contractId: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${contractId}/reanalyze`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(data.error || 'Rate limit exceeded. Please try again later.');
        }
        throw new Error(data.error || 'Re-analysis failed');
      }

      setAnalysis(data.analysis);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-analysis failed');
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { analyze, reanalyze, isAnalyzing, error, analysis };
}
```

## Definition of Done

- [ ] Re-analyze endpoint working with rate limiting
- [ ] Analysis version incremented on re-analysis
- [ ] AnalysisMetadata shows timestamp and version
- [ ] ReanalyzeButton triggers modal
- [ ] Confirmation modal warns about API usage
- [ ] Loading state during re-analysis
- [ ] Previous analysis preserved until new completes
- [ ] Errors handled gracefully

## Testing Checklist

### Unit Tests

- [ ] AnalysisMetadata renders correctly
- [ ] ReanalyzeButton shows loading state
- [ ] Modal opens and closes

### Integration Tests

- [ ] Re-analyze endpoint increments version
- [ ] Rate limiting applies to re-analysis
- [ ] Previous analysis preserved on error
- [ ] New analysis replaces old on success

### E2E Tests

- [ ] Click re-analyze → See modal
- [ ] Confirm → See loading → See new results
- [ ] Cancel → Modal closes
- [ ] Version number updates after re-analysis

## Future Enhancements

For post-MVP consideration:

- **Version History:** Store all previous analyses with ability to view/compare
- **Diff View:** Show changes between analysis versions
- **Auto Re-analyze:** Option to re-analyze when new AI models are released
- **Comparison Mode:** Side-by-side comparison of analysis versions

## Related Documents

- [Epic 2 Tech Spec](./tech-spec-epic-2.md)
- [Story 2.3: OpenAI Integration](./2-3-openai-gpt4-integration.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create reanalyze endpoint**
  - [ ] Add POST /api/contracts/:id/reanalyze route
  - [ ] Apply requireAuth and aiLimiter
  - [ ] Verify contract exists and has analysis
  - [ ] Store previous version number
  - [ ] Run new analysis
  - [ ] Increment version number
  - [ ] Preserve previous analysis on error

- [ ] **Task 2: Create AnalysisMetadata component**
  - [ ] Create `client/src/components/contracts/AnalysisMetadata.tsx`
  - [ ] Display analyzed timestamp with relative time
  - [ ] Show version number
  - [ ] Show model version if available
  - [ ] Show processing time

- [ ] **Task 3: Create ReanalyzeButton component**
  - [ ] Create `client/src/components/contracts/ReanalyzeButton.tsx`
  - [ ] Show refresh icon
  - [ ] Display loading state
  - [ ] Handle disabled state

- [ ] **Task 4: Create ReanalyzeConfirmModal component**
  - [ ] Create `client/src/components/contracts/ReanalyzeConfirmModal.tsx`
  - [ ] Explain re-analysis action
  - [ ] Show rate limit status if available
  - [ ] List reasons results may vary
  - [ ] Add confirm/cancel buttons

- [ ] **Task 5: Update useContractAnalysis hook**
  - [ ] Add reanalyze function
  - [ ] Handle rate limit errors
  - [ ] Return updated contract data

- [ ] **Task 6: Update ContractView page**
  - [ ] Add AnalysisMetadata display
  - [ ] Add ReanalyzeButton
  - [ ] Wire up modal and re-analysis
  - [ ] Update contract state after re-analysis

- [ ] **Task 7: Write tests**
  - [ ] Unit tests for AnalysisMetadata
  - [ ] Unit tests for ReanalyzeButton states
  - [ ] Unit tests for modal
  - [ ] Integration tests for reanalyze endpoint
  - [ ] Integration tests for version increment
  - [ ] E2E test for complete re-analysis flow

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
