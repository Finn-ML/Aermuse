# Story 8.3: Folder Organization

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 8.3 |
| **Epic** | Epic 8: Contract Storage & Search |
| **Title** | Folder Organization |
| **Priority** | P1 - High |
| **Story Points** | 4 |
| **Status** | Drafted |

## User Story

**As a** user
**I want** to organize contracts into folders
**So that** I can keep them categorized

## Context

Folders provide a familiar organizational structure for users to categorize their contracts. This is especially useful for users who work with different clients, projects, or contract types.

**Dependencies:**
- Contracts system (existing)

## Acceptance Criteria

- [ ] **AC-1:** Create custom folders with name
- [ ] **AC-2:** Rename folders
- [ ] **AC-3:** Delete empty folders only (prevent accidental data loss)
- [ ] **AC-4:** Move contracts between folders
- [ ] **AC-5:** Folder list in sidebar
- [ ] **AC-6:** "All Contracts" and "Unfiled" sections
- [ ] **AC-7:** Folder color labels (optional)
- [ ] **AC-8:** Contract count per folder

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/db/schema/contractFolders.ts` | New: Folders schema |
| `server/routes/folders.ts` | New: Folders API |
| `client/src/components/contracts/FolderSidebar.tsx` | New: Sidebar component |
| `client/src/components/contracts/MoveToFolderModal.tsx` | New: Move modal |

### Implementation

#### Drizzle Schema

```typescript
// server/db/schema/contractFolders.ts
import { pgTable, varchar, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { contracts } from './contracts';

export const contractFolders = pgTable('contract_folders', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 7 }), // Hex: #FF5733
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userNameUnique: uniqueIndex('idx_folders_user_name').on(table.userId, table.name),
}));

export const contractFoldersRelations = relations(contractFolders, ({ one, many }) => ({
  user: one(users, {
    fields: [contractFolders.userId],
    references: [users.id],
  }),
  contracts: many(contracts),
}));

export type ContractFolder = typeof contractFolders.$inferSelect;
export type NewContractFolder = typeof contractFolders.$inferInsert;
```

#### Folders API

```typescript
// server/routes/folders.ts
import { Router } from 'express';
import { db } from '../db';
import { contractFolders } from '../db/schema/contractFolders';
import { contracts } from '../db/schema/contracts';
import { eq, and, count, asc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const folderSchema = z.object({
  name: z.string().min(1).max(255),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// GET /api/folders - List folders with contract counts
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const folders = await db.query.contractFolders.findMany({
      where: eq(contractFolders.userId, userId),
      orderBy: asc(contractFolders.sortOrder),
    });

    // Get contract counts per folder
    const folderCounts = await db
      .select({
        folderId: contracts.folderId,
        count: count(),
      })
      .from(contracts)
      .where(eq(contracts.userId, userId))
      .groupBy(contracts.folderId);

    const countMap = new Map(
      folderCounts.map((fc) => [fc.folderId, fc.count])
    );

    // Get unfiled count
    const [unfiledResult] = await db
      .select({ count: count() })
      .from(contracts)
      .where(
        and(
          eq(contracts.userId, userId),
          sql`${contracts.folderId} IS NULL`
        )
      );

    const foldersWithCounts = folders.map((folder) => ({
      ...folder,
      contractCount: countMap.get(folder.id) || 0,
    }));

    res.json({
      folders: foldersWithCounts,
      unfiledCount: unfiledResult.count,
    });
  } catch (error) {
    console.error('[FOLDERS] List error:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// POST /api/folders - Create folder
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const parsed = folderSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const { name, color } = parsed.data;

    // Check for duplicate name
    const existing = await db.query.contractFolders.findFirst({
      where: and(
        eq(contractFolders.userId, userId),
        eq(contractFolders.name, name)
      ),
    });

    if (existing) {
      return res.status(400).json({ error: 'Folder name already exists' });
    }

    // Get max sort order
    const [maxOrder] = await db
      .select({ max: sql<number>`COALESCE(MAX(${contractFolders.sortOrder}), 0)` })
      .from(contractFolders)
      .where(eq(contractFolders.userId, userId));

    const [folder] = await db
      .insert(contractFolders)
      .values({
        userId,
        name,
        color,
        sortOrder: (maxOrder.max || 0) + 1,
      })
      .returning();

    res.status(201).json(folder);
  } catch (error) {
    console.error('[FOLDERS] Create error:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// PATCH /api/folders/:id - Update folder
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const parsed = folderSchema.partial().safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const folder = await db.query.contractFolders.findFirst({
      where: and(
        eq(contractFolders.id, id),
        eq(contractFolders.userId, userId)
      ),
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check for duplicate name if changing
    if (parsed.data.name && parsed.data.name !== folder.name) {
      const existing = await db.query.contractFolders.findFirst({
        where: and(
          eq(contractFolders.userId, userId),
          eq(contractFolders.name, parsed.data.name)
        ),
      });

      if (existing) {
        return res.status(400).json({ error: 'Folder name already exists' });
      }
    }

    const [updated] = await db
      .update(contractFolders)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(contractFolders.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('[FOLDERS] Update error:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// DELETE /api/folders/:id - Delete empty folder
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const folder = await db.query.contractFolders.findFirst({
      where: and(
        eq(contractFolders.id, id),
        eq(contractFolders.userId, userId)
      ),
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check if folder has contracts
    const [countResult] = await db
      .select({ count: count() })
      .from(contracts)
      .where(eq(contracts.folderId, id));

    if (countResult.count > 0) {
      return res.status(400).json({
        error: 'Cannot delete folder with contracts. Move or delete contracts first.',
      });
    }

    await db.delete(contractFolders).where(eq(contractFolders.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error('[FOLDERS] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// POST /api/contracts/:id/move - Move contract to folder
router.post('/contracts/:id/move', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { folderId } = req.body; // null to remove from folder

    const contract = await db.query.contracts.findFirst({
      where: and(
        eq(contracts.id, id),
        eq(contracts.userId, userId)
      ),
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Verify folder belongs to user if provided
    if (folderId) {
      const folder = await db.query.contractFolders.findFirst({
        where: and(
          eq(contractFolders.id, folderId),
          eq(contractFolders.userId, userId)
        ),
      });

      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }
    }

    await db
      .update(contracts)
      .set({ folderId: folderId || null, updatedAt: new Date() })
      .where(eq(contracts.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error('[FOLDERS] Move error:', error);
    res.status(500).json({ error: 'Failed to move contract' });
  }
});

export default router;
```

#### Folder Sidebar Component

```tsx
// client/src/components/contracts/FolderSidebar.tsx
import { useState, useEffect } from 'react';
import { Folder, FolderPlus, MoreVertical, Pencil, Trash2, FileText } from 'lucide-react';
import { CreateFolderModal } from './CreateFolderModal';

interface FolderItem {
  id: string;
  name: string;
  color: string | null;
  contractCount: number;
}

interface Props {
  selectedFolder: string | null; // null = all, 'unfiled' = unfiled
  onSelectFolder: (folderId: string | null) => void;
}

export function FolderSidebar({ selectedFolder, onSelectFolder }: Props) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [unfiledCount, setUnfiledCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    const response = await fetch('/api/folders', { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      setFolders(data.folders);
      setUnfiledCount(data.unfiledCount);
      setTotalCount(
        data.folders.reduce((sum: number, f: FolderItem) => sum + f.contractCount, 0) +
        data.unfiledCount
      );
    }
  };

  const handleDelete = async (folderId: string) => {
    if (!confirm('Delete this folder?')) return;

    const response = await fetch(`/api/folders/${folderId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (response.ok) {
      fetchFolders();
      if (selectedFolder === folderId) {
        onSelectFolder(null);
      }
    } else {
      const data = await response.json();
      alert(data.error);
    }
  };

  return (
    <div className="w-64 bg-white border-r h-full">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Folders</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
            aria-label="Create folder"
          >
            <FolderPlus className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* All Contracts */}
        <button
          onClick={() => onSelectFolder(null)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 ${
            selectedFolder === null
              ? 'bg-burgundy-50 text-burgundy-700'
              : 'hover:bg-gray-50'
          }`}
        >
          <FileText className="h-5 w-5" />
          <span className="flex-1 text-left">All Contracts</span>
          <span className="text-sm text-gray-500">{totalCount}</span>
        </button>

        {/* Unfiled */}
        <button
          onClick={() => onSelectFolder('unfiled')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-3 ${
            selectedFolder === 'unfiled'
              ? 'bg-burgundy-50 text-burgundy-700'
              : 'hover:bg-gray-50'
          }`}
        >
          <Folder className="h-5 w-5" />
          <span className="flex-1 text-left">Unfiled</span>
          <span className="text-sm text-gray-500">{unfiledCount}</span>
        </button>

        <hr className="my-3" />

        {/* Custom Folders */}
        <div className="space-y-1">
          {folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              isSelected={selectedFolder === folder.id}
              onSelect={() => onSelectFolder(folder.id)}
              onEdit={() => setEditingFolder(folder)}
              onDelete={() => handleDelete(folder.id)}
            />
          ))}
        </div>

        {folders.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No folders yet
          </p>
        )}
      </div>

      {/* Create Modal */}
      <CreateFolderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchFolders}
      />

      {/* Edit Modal */}
      {editingFolder && (
        <CreateFolderModal
          isOpen={true}
          onClose={() => setEditingFolder(null)}
          onCreated={fetchFolders}
          folder={editingFolder}
        />
      )}
    </div>
  );
}

interface FolderItemProps {
  folder: FolderItem;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function FolderItem({ folder, isSelected, onSelect, onEdit, onDelete }: FolderItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative group">
      <button
        onClick={onSelect}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${
          isSelected
            ? 'bg-burgundy-50 text-burgundy-700'
            : 'hover:bg-gray-50'
        }`}
      >
        <div
          className="w-5 h-5 rounded flex items-center justify-center"
          style={{ backgroundColor: folder.color || '#6B7280' }}
        >
          <Folder className="h-3 w-3 text-white" />
        </div>
        <span className="flex-1 text-left truncate">{folder.name}</span>
        <span className="text-sm text-gray-500">{folder.contractCount}</span>
      </button>

      {/* Menu Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded"
      >
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border py-1 z-20">
            <button
              onClick={() => {
                setShowMenu(false);
                onEdit();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
              Rename
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

#### Move to Folder Modal

```tsx
// client/src/components/contracts/MoveToFolderModal.tsx
import { useState, useEffect } from 'react';
import { X, Folder, FolderMinus } from 'lucide-react';

interface FolderItem {
  id: string;
  name: string;
  color: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  currentFolderId: string | null;
  onMoved: () => void;
}

export function MoveToFolderModal({ isOpen, onClose, contractId, currentFolderId, onMoved }: Props) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
    }
  }, [isOpen]);

  const fetchFolders = async () => {
    const response = await fetch('/api/folders', { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      setFolders(data.folders);
    }
  };

  const handleMove = async (folderId: string | null) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ folderId }),
      });

      if (response.ok) {
        onMoved();
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Move to Folder</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {/* Remove from folder option */}
          {currentFolderId && (
            <button
              onClick={() => handleMove(null)}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-left"
            >
              <FolderMinus className="h-5 w-5 text-gray-500" />
              <span>Remove from folder</span>
            </button>
          )}

          {/* Folder list */}
          {folders
            .filter((f) => f.id !== currentFolderId)
            .map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleMove(folder.id)}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-left"
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ backgroundColor: folder.color || '#6B7280' }}
                >
                  <Folder className="h-3 w-3 text-white" />
                </div>
                <span>{folder.name}</span>
              </button>
            ))}

          {folders.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No folders available. Create a folder first.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Definition of Done

- [ ] Create folder works
- [ ] Rename folder works
- [ ] Delete empty folder works
- [ ] Move contract to folder works
- [ ] Folder sidebar displays
- [ ] Contract counts accurate
- [ ] Unfiled section works

## Testing Checklist

### Unit Tests

- [ ] Folder name validation
- [ ] Color format validation

### Integration Tests

- [ ] Folder CRUD operations
- [ ] Move contract
- [ ] Delete non-empty folder blocked

### E2E Tests

- [ ] Create and use folders
- [ ] Move contracts
- [ ] Delete folder

## Related Documents

- [Epic 8 Tech Spec](./tech-spec-epic-8.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create contract folders database schema**
  - [ ] Create contractFolders.ts schema file
  - [ ] Define table with id, userId, name, color, sortOrder fields
  - [ ] Add unique index on userId + name
  - [ ] Create relations to users and contracts tables
  - [ ] Add TypeScript types for ContractFolder
  - [ ] Run database migration

- [ ] **Task 2: Update contracts schema**
  - [ ] Add folderId foreign key to contracts table
  - [ ] Create migration for schema update
  - [ ] Update contract relations to include folder
  - [ ] Test cascading deletes

- [ ] **Task 3: Create folders API routes**
  - [ ] Implement GET /api/folders with contract counts
  - [ ] Implement POST /api/folders with validation
  - [ ] Implement PATCH /api/folders/:id for rename/color update
  - [ ] Implement DELETE /api/folders/:id with empty check
  - [ ] Implement POST /api/contracts/:id/move to move contracts
  - [ ] Add Zod validation schemas

- [ ] **Task 4: Create FolderSidebar component**
  - [ ] Build sidebar layout with folder list
  - [ ] Add "All Contracts" and "Unfiled" sections
  - [ ] Implement folder selection highlighting
  - [ ] Add contract count badges per folder
  - [ ] Add folder create button
  - [ ] Build FolderItem subcomponent with dropdown menu

- [ ] **Task 5: Create CreateFolderModal component**
  - [ ] Build modal UI for folder creation
  - [ ] Add name input field with validation
  - [ ] Add color picker for folder labels
  - [ ] Support edit mode for renaming
  - [ ] Handle form submission
  - [ ] Show validation errors

- [ ] **Task 6: Create MoveToFolderModal component**
  - [ ] Build modal UI with folder list
  - [ ] Add "Remove from folder" option
  - [ ] Filter out current folder from list
  - [ ] Implement move API call
  - [ ] Show loading state during move
  - [ ] Handle empty folder state

- [ ] **Task 7: Integrate folders in Contracts page**
  - [ ] Add FolderSidebar to page layout
  - [ ] Implement folder filtering in contract list
  - [ ] Add move to folder button in contract actions
  - [ ] Update contract counts after operations
  - [ ] Handle unfiled contracts view

- [ ] **Task 8: Testing and validation**
  - [ ] Write unit tests for name validation
  - [ ] Write integration tests for folder CRUD
  - [ ] Test delete prevention for non-empty folders
  - [ ] Test contract move operations
  - [ ] Write E2E tests for folder workflows
  - [ ] Test concurrent folder operations

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
