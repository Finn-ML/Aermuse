# Story 9.10: Landing Page Editor Redesign

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 9.10 |
| **Epic** | Epic 9: Landing Page Customization |
| **Title** | Landing Page Editor Redesign |
| **Priority** | P2 - Low (Phase 3) |
| **Story Points** | 5 |
| **Status** | Drafted |

## User Story

**As an** artist
**I want** a redesigned editor with organized tabs and live preview
**So that** I can efficiently customize my landing page

## Context

Consolidates all Epic 9 customization features into a cohesive tabbed editor interface. Provides side-by-side editing with live preview. This is the capstone story that ties together all customization components.

**Dependencies:**
- All previous Epic 9 stories (9.1-9.9)

## Acceptance Criteria

- [ ] **AC-1:** Editor has tabbed navigation (Design, Links, Social, Settings)
- [ ] **AC-2:** Live preview panel shows changes in real-time
- [ ] **AC-3:** Preview is responsive (mobile/desktop toggle)
- [ ] **AC-4:** Unsaved changes warning on navigation
- [ ] **AC-5:** Save button with loading state
- [ ] **AC-6:** Mobile-friendly editor (tabs collapse to dropdown)
- [ ] **AC-7:** Keyboard shortcuts for save (Cmd/Ctrl+S)

## Technical Requirements

### Files to Create

| File | Purpose |
|------|---------|
| `client/src/components/landing/LandingPageEditor.tsx` | Main tabbed editor component |
| `client/src/components/landing/EditorPreview.tsx` | Live preview panel |
| `client/src/components/landing/DesignTab.tsx` | Theme, colors, fonts, buttons, background |
| `client/src/components/landing/LinksTab.tsx` | Links, headers, video embeds |
| `client/src/components/landing/SocialTab.tsx` | Social icons editor |
| `client/src/components/landing/SettingsTab.tsx` | Layout, visibility options |

### Files to Modify

| File | Changes |
|------|---------|
| `client/src/pages/Dashboard.tsx` | Replace inline editor with LandingPageEditor |

### Editor Tab Structure

```typescript
const EDITOR_TABS = [
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'links', label: 'Links', icon: Link },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];
```

### Tab Contents

**Design Tab:**
- Theme preset selector (from 9.1)
- Color pickers (from 9.2)
- Font selectors (from 9.3)
- Button style picker (from 9.4)
- Background editor (from 9.5)

**Links Tab:**
- Link list with drag-and-drop
- Add Link button
- Add Header button (from 9.7)
- Add Video button (Pro, from 9.9)
- Edit/delete for each item

**Social Tab:**
- Social icons editor (from 9.6)
- Show/hide social bar toggle
- Reorder icons

**Settings Tab:**
- Layout selector (from 9.8)
- Avatar position
- Link width
- Page visibility toggle (publish/unpublish)

### Editor Layout

```tsx
// LandingPageEditor.tsx structure
<div className="editor-container flex h-full">
  {/* Left: Editor Panel */}
  <div className="editor-panel w-1/2 border-r overflow-y-auto">
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="sticky top-0 bg-background z-10">
        {EDITOR_TABS.map(tab => (
          <TabsTrigger key={tab.id} value={tab.id}>
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="design"><DesignTab /></TabsContent>
      <TabsContent value="links"><LinksTab /></TabsContent>
      <TabsContent value="social"><SocialTab /></TabsContent>
      <TabsContent value="settings"><SettingsTab /></TabsContent>
    </Tabs>

    {/* Save Button */}
    <div className="sticky bottom-0 p-4 bg-background border-t">
      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? <Loader2 className="animate-spin" /> : 'Save Changes'}
      </Button>
    </div>
  </div>

  {/* Right: Preview Panel */}
  <div className="preview-panel w-1/2 bg-muted/50">
    <EditorPreview page={draftPage} />
  </div>
</div>
```

### Live Preview Component

```tsx
// EditorPreview.tsx
interface EditorPreviewProps {
  page: LandingPage;
}

export function EditorPreview({ page }: EditorPreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className="preview-wrapper h-full flex flex-col">
      {/* Preview Controls */}
      <div className="preview-controls p-2 border-b flex justify-between">
        <span className="text-sm text-muted-foreground">Preview</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === 'desktop' ? 'default' : 'ghost'}
            onClick={() => setViewMode('desktop')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'mobile' ? 'default' : 'ghost'}
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview Frame */}
      <div className="preview-frame flex-1 overflow-auto p-4 flex justify-center">
        <div
          className={cn(
            'preview-content bg-white rounded-lg shadow-lg overflow-hidden',
            viewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-[800px]'
          )}
        >
          {/* Render ArtistPage content inline */}
          <ArtistPagePreview page={page} />
        </div>
      </div>
    </div>
  );
}
```

### Unsaved Changes Hook

```typescript
// Hook to track unsaved changes
function useUnsavedChanges(hasChanges: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);
}
```

### Keyboard Shortcuts

```typescript
// Save shortcut
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleSave]);
```

## Definition of Done

- [ ] LandingPageEditor component created with 4 tabs
- [ ] All customization components integrated into tabs
- [ ] EditorPreview shows live changes
- [ ] Desktop/mobile preview toggle works
- [ ] Unsaved changes warning on navigation
- [ ] Save button with loading state
- [ ] Keyboard shortcut Cmd/Ctrl+S works
- [ ] Mobile responsive (tabs collapse)
- [ ] Type check passes

---

## Tasks/Subtasks

- [ ] **Task 1: Create Tab Components**
  - [ ] Create `DesignTab.tsx` - integrate theme, colors, fonts, buttons, background
  - [ ] Create `LinksTab.tsx` - integrate link editor with headers/videos
  - [ ] Create `SocialTab.tsx` - integrate social icons editor
  - [ ] Create `SettingsTab.tsx` - integrate layout options

- [ ] **Task 2: Create EditorPreview Component**
  - [ ] Create `EditorPreview.tsx`
  - [ ] Add desktop/mobile toggle
  - [ ] Render page content with all styles
  - [ ] Make preview scrollable

- [ ] **Task 3: Create LandingPageEditor Component**
  - [ ] Create `LandingPageEditor.tsx`
  - [ ] Implement tabbed navigation using shadcn Tabs
  - [ ] Wire up all tab components
  - [ ] Add save button with loading state
  - [ ] Track unsaved changes

- [ ] **Task 4: Integrate in Dashboard**
  - [ ] Replace existing landing page editor section
  - [ ] Pass landing page data and save handler
  - [ ] Handle save success/error states

- [ ] **Task 5: Add UX Enhancements**
  - [ ] Implement unsaved changes warning
  - [ ] Add Cmd/Ctrl+S keyboard shortcut
  - [ ] Mobile responsive tabs (dropdown on small screens)
  - [ ] Auto-save draft to localStorage

- [ ] **Task 6: Testing**
  - [ ] Test all tabs render correctly
  - [ ] Test preview updates in real-time
  - [ ] Test desktop/mobile preview toggle
  - [ ] Test unsaved changes warning
  - [ ] Test keyboard shortcut
  - [ ] Test on mobile devices

---

## Dev Notes

### Component Integration

This story consolidates all previous Epic 9 components:
- ThemeSelector (9.1)
- ColorPicker (9.2)
- FontSelector (9.3)
- ButtonStylePicker (9.4)
- BackgroundEditor (9.5)
- SocialIconsEditor (9.6)
- Link headers (9.7)
- LayoutSelector (9.8)
- VideoEmbedEditor (9.9)

### State Management

```typescript
// Use a single draft state for all changes
const [draftPage, setDraftPage] = useState<LandingPage>(initialPage);
const [hasChanges, setHasChanges] = useState(false);

const updateDraft = (updates: Partial<LandingPage>) => {
  setDraftPage(prev => ({ ...prev, ...updates }));
  setHasChanges(true);
};

// Pass updateDraft to all child components
<DesignTab page={draftPage} onChange={updateDraft} />
```

### Mobile Tab Dropdown

```tsx
// On mobile, use Select instead of TabsList
{isMobile ? (
  <Select value={activeTab} onValueChange={setActiveTab}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {EDITOR_TABS.map(tab => (
        <SelectItem key={tab.id} value={tab.id}>
          {tab.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
) : (
  <TabsList>...</TabsList>
)}
```

### References
- [Source: docs/sprint-artifacts/tech-spec-epic-9.md#Editor-Redesign]
- All previous Epic 9 stories

---

## Dev Agent Record

### Context Reference

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-01 | Story drafted | SM Agent (Bob) |
