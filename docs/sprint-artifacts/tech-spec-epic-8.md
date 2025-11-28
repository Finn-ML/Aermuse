# Epic 8: Contract Storage & Search - Technical Specification

## Overview

This epic enhances contract management with search, filtering, folder organization, PDF export, version history, and sorting capabilities. These features improve usability for users with many contracts.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     Contract Management UI                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Search Bar  │  Filters  │  Sort Dropdown  │  View Toggle │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────┐  ┌────────────────────────────────────────┐   │
│  │   Folders    │  │           Contracts List                │   │
│  │   Sidebar    │  │  - Contract cards with actions          │   │
│  │              │  │  - PDF export, view history, etc.       │   │
│  └──────────────┘  └────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend Services                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Search API   │  │ Folders API  │  │ Version History API  │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ PDF Service  │  │ Filter Logic │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Contract folders
CREATE TABLE contract_folders (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7), -- Hex color code
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Add folder reference to contracts
ALTER TABLE contracts ADD COLUMN folder_id VARCHAR(36) REFERENCES contract_folders(id) ON DELETE SET NULL;

-- Contract versions for history
CREATE TABLE contract_versions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id VARCHAR(36) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,
  change_summary TEXT,
  changed_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contract_id, version_number)
);

-- Indexes for search and filtering
CREATE INDEX idx_contracts_folder ON contracts(folder_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_created_at ON contracts(created_at DESC);
CREATE INDEX idx_contracts_title_gin ON contracts USING gin(to_tsvector('english', title));
CREATE INDEX idx_contract_versions_contract ON contract_versions(contract_id);
```

### Drizzle Schema

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
  color: varchar('color', { length: 7 }),
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

// server/db/schema/contractVersions.ts
import { pgTable, varchar, integer, timestamp, text, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { contracts } from './contracts';
import { users } from './users';

export const contractVersions = pgTable('contract_versions', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  contractId: varchar('contract_id', { length: 36 })
    .notNull()
    .references(() => contracts.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  content: jsonb('content').notNull(),
  changeSummary: text('change_summary'),
  changedBy: varchar('changed_by', { length: 36 }).references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  contractVersionUnique: uniqueIndex('idx_versions_contract_number').on(table.contractId, table.versionNumber),
}));

export const contractVersionsRelations = relations(contractVersions, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractVersions.contractId],
    references: [contracts.id],
  }),
  changedByUser: one(users, {
    fields: [contractVersions.changedBy],
    references: [users.id],
  }),
}));
```

## API Design

### Search & Filter Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contracts?search=&status=&type=&from=&to=&folder=&sort=&order=` | Search/filter contracts |

### Folder Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/folders` | List user's folders |
| POST | `/api/folders` | Create folder |
| PATCH | `/api/folders/:id` | Update folder |
| DELETE | `/api/folders/:id` | Delete empty folder |
| POST | `/api/contracts/:id/move` | Move contract to folder |

### Version History Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contracts/:id/versions` | List versions |
| GET | `/api/contracts/:id/versions/:version` | Get specific version |
| POST | `/api/contracts/:id/restore/:version` | Restore version |

### PDF Export Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contracts/:id/pdf` | Download contract as PDF |

## PDF Generation

Using Puppeteer for HTML-to-PDF conversion:

```typescript
// server/services/pdfGenerator.ts
import puppeteer from 'puppeteer';

interface ContractPdfOptions {
  title: string;
  content: string;
  parties: { name: string; role: string }[];
  signatures?: { name: string; signedAt: string }[];
  metadata: {
    createdAt: string;
    version: number;
    status: string;
  };
}

export async function generateContractPdf(options: ContractPdfOptions): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const html = generatePdfHtml(options);
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
    printBackground: true,
  });

  await browser.close();
  return Buffer.from(pdf);
}
```

## Story Summary

| Story | Title | Points | Priority |
|-------|-------|--------|----------|
| 8.1 | Contract Search | 3 | High |
| 8.2 | Advanced Filtering | 3 | High |
| 8.3 | Folder Organization | 4 | Medium |
| 8.4 | PDF Export | 4 | High |
| 8.5 | Version History | 5 | Medium |
| 8.6 | Contract Sorting | 2 | Low |

**Total: 21 story points**

## Dependencies

- Contracts system (existing)
- Puppeteer for PDF generation

## Performance Considerations

1. **Search**: Use PostgreSQL full-text search for efficient text matching
2. **Pagination**: All list endpoints paginated
3. **Indexing**: Proper indexes on filter columns
4. **PDF Caching**: Consider caching generated PDFs for signed contracts

## Testing Strategy

### Unit Tests
- Search query building
- Filter logic
- Version numbering

### Integration Tests
- Search API accuracy
- Folder CRUD operations
- PDF generation

### E2E Tests
- Search and filter flow
- Folder management
- PDF download
