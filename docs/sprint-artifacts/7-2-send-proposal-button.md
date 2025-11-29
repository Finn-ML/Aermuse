# Story 7.2: Send Proposal Button

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 7.2 |
| **Epic** | Epic 7: Landing Page Enhancements |
| **Title** | Send Proposal Button |
| **Priority** | P2 - Medium |
| **Story Points** | 1 |
| **Status** | Drafted |

## User Story

**As a** visitor on an artist's page
**I want** to see a "Send Proposal" button
**So that** I can initiate a business conversation

## Context

The Send Proposal button is the entry point for external parties to contact artists. It should be prominently displayed on published landing pages and trigger the proposal form modal.

**Dependencies:**
- Story 7.1 (Proposal Data Model)
- Landing Pages feature (existing)

## Acceptance Criteria

- [ ] **AC-1:** Button prominently displayed on published landing pages
- [ ] **AC-2:** Button matches Aermuse brand styling (burgundy theme)
- [ ] **AC-3:** Opens proposal form modal on click
- [ ] **AC-4:** Visible on both mobile and desktop
- [ ] **AC-5:** Button disabled state while modal is loading
- [ ] **AC-6:** Only shown on published (public) pages

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/pages/LandingPageView.tsx` | Add: Send Proposal button |
| `client/src/components/landing/SendProposalButton.tsx` | New: Button component |

### Implementation

#### Send Proposal Button Component

```tsx
// client/src/components/landing/SendProposalButton.tsx
import { useState } from 'react';
import { Send } from 'lucide-react';
import { ProposalFormModal } from './ProposalFormModal';

interface Props {
  landingPageId: string;
  artistName: string;
}

export function SendProposalButton({ landingPageId, artistName }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-2 px-6 py-3 bg-burgundy-600 hover:bg-burgundy-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:ring-offset-2"
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
      />
    </>
  );
}
```

#### Landing Page Integration

```tsx
// client/src/pages/LandingPageView.tsx (add to existing component)
import { SendProposalButton } from '../components/landing/SendProposalButton';

// Inside the landing page component, add to the header/CTA section:
export function LandingPageView() {
  // ... existing code

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Artist info */}
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {landingPage.title}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {landingPage.tagline}
          </p>

          {/* Send Proposal Button - prominently placed */}
          <div className="mt-8">
            <SendProposalButton
              landingPageId={landingPage.id}
              artistName={landingPage.title}
            />
          </div>
        </div>
      </section>

      {/* Rest of landing page content */}
      {/* ... */}

      {/* Footer CTA - secondary placement */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            Interested in working together?
          </h2>
          <p className="text-gray-600 mb-6">
            Send a proposal to discuss collaboration, licensing, booking, and more.
          </p>
          <SendProposalButton
            landingPageId={landingPage.id}
            artistName={landingPage.title}
          />
        </div>
      </section>
    </div>
  );
}
```

#### Mobile Responsive Styles

```tsx
// Button automatically responsive via Tailwind classes
// For fixed mobile CTA (optional enhancement):

export function MobileSendProposalCTA({ landingPageId, artistName }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Fixed bottom button on mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg md:hidden z-40">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-burgundy-600 hover:bg-burgundy-700 text-white font-semibold rounded-lg"
        >
          <Send className="h-5 w-5" />
          Send Proposal
        </button>
      </div>

      <ProposalFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        landingPageId={landingPageId}
        artistName={artistName}
      />
    </>
  );
}
```

## Definition of Done

- [ ] Button displays on published landing pages
- [ ] Styling matches brand guidelines
- [ ] Modal opens on click
- [ ] Responsive on mobile and desktop
- [ ] Accessible with keyboard navigation

## Testing Checklist

### Visual Tests

- [ ] Button visible in hero section
- [ ] Button visible in footer CTA
- [ ] Mobile view displays correctly
- [ ] Hover states work

### Functional Tests

- [ ] Click opens modal
- [ ] Button doesn't appear on draft pages
- [ ] Keyboard accessible (Enter/Space)

### Accessibility Tests

- [ ] Has aria-label
- [ ] Focus ring visible
- [ ] Screen reader announces correctly

## Related Documents

- [Epic 7 Tech Spec](./tech-spec-epic-7.md)
- [Story 7.3: Proposal Submission Form](./7-3-proposal-submission-form.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create Send Proposal Button Component**
  - [ ] Create `client/src/components/landing/SendProposalButton.tsx`
  - [ ] Implement button component with modal state management
  - [ ] Add burgundy theme styling with hover and focus states
  - [ ] Integrate lucide-react Send icon
  - [ ] Add accessibility attributes (aria-label, focus ring)
  - [ ] Implement ProposalFormModal integration

- [ ] **Task 2: Integrate Button into Landing Page View**
  - [ ] Modify `client/src/pages/LandingPageView.tsx`
  - [ ] Add SendProposalButton to hero section
  - [ ] Add SendProposalButton to footer CTA section
  - [ ] Ensure button only appears on published pages
  - [ ] Test button placement and visibility

- [ ] **Task 3: Implement Mobile Responsive Design**
  - [ ] Verify button responsive styling on mobile devices
  - [ ] Test button functionality on mobile viewports
  - [ ] Ensure modal opens correctly on mobile
  - [ ] Optional: Add fixed bottom CTA for mobile (MobileSendProposalCTA)

- [ ] **Task 4: Accessibility Implementation**
  - [ ] Add keyboard navigation support (Enter/Space keys)
  - [ ] Implement proper focus management
  - [ ] Add screen reader announcements
  - [ ] Test with keyboard-only navigation

- [ ] **Task 5: Testing**
  - [ ] Visual test: Button appears in hero and footer sections
  - [ ] Visual test: Mobile view displays correctly
  - [ ] Visual test: Hover states work as expected
  - [ ] Functional test: Click opens modal
  - [ ] Functional test: Button doesn't appear on draft pages
  - [ ] Accessibility test: Keyboard navigation works
  - [ ] Accessibility test: Screen reader announces correctly

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
