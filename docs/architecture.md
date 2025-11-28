# Aermuse MVP Architecture Document

## Overview

This document defines the technical architecture for implementing the Aermuse MVP - an AI-powered contract analysis and management platform for music industry professionals.

**Document Purpose:** Provide implementation guidance for AI agents and developers to ensure consistent, coherent development across all epics.

**Project Type:** Brownfield (extending existing React/Express/PostgreSQL application)

---

## Technology Stack

### Existing Stack (Retained)
| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React | 18.x |
| Build Tool | Vite | 5.x |
| Styling | TailwindCSS | 3.x |
| Backend | Express.js | 4.x |
| Database | PostgreSQL (Neon) | 15+ |
| ORM | Drizzle ORM | Latest |
| Language | TypeScript | 5.x |
| Runtime | Node.js | 20.x |

### New Integrations
| Service | Purpose | Integration Method |
|---------|---------|-------------------|
| Stripe | Subscription billing | SDK + Webhooks |
| OpenAI | AI contract analysis | REST API |
| Postmark | Transactional email | REST API |
| DocuSeal | E-signatures | Self-hosted REST API |
| Replit Object Storage | File storage | SDK |

---

## Architectural Decisions

### ADR-001: Password Hashing
- **Decision:** bcrypt with cost factor 12
- **Rationale:** Industry standard, built-in salt, adjustable cost factor
- **Implementation:** Replace existing SHA-256 hashing
- **Package:** `bcrypt`

### ADR-002: PDF Text Extraction
- **Decision:** pdf-parse
- **Rationale:** Pure JavaScript, no native dependencies, works on Replit
- **Use Case:** Extract text from uploaded contracts for AI analysis
- **Package:** `pdf-parse`

### ADR-003: PDF Generation
- **Decision:** pdf-lib
- **Rationale:** Pure JavaScript, can modify existing PDFs, add signatures
- **Use Case:** Generate signed contract PDFs, export contracts
- **Package:** `pdf-lib`

### ADR-004: Session Storage
- **Decision:** connect-pg-simple (PostgreSQL)
- **Rationale:** Uses existing database, persistent across restarts
- **Configuration:**
  ```typescript
  {
    store: new PgSession({
      pool: pgPool,
      tableName: 'user_sessions'
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax'
    }
  }
  ```

### ADR-005: Admin Role Management
- **Decision:** Role field on users table
- **Rationale:** Simple, no additional tables, sufficient for MVP
- **Schema Change:**
  ```sql
  ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
  -- Values: 'user', 'admin'
  ```

### ADR-006: API Versioning
- **Decision:** No versioning for MVP
- **Rationale:** Single client, rapid iteration, unnecessary complexity
- **Future:** Add `/api/v2/` prefix when needed

### ADR-007: Rate Limiting
- **Decision:** express-rate-limit
- **Rationale:** Simple middleware, in-memory store sufficient for MVP
- **Configuration:**
  ```typescript
  // General API: 100 requests per 15 minutes
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  });

  // Auth endpoints: 5 attempts per 15 minutes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5
  });

  // AI analysis: 10 per hour (expensive)
  const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10
  });
  ```

### ADR-008: Background Jobs
- **Decision:** Inline async processing for MVP
- **Rationale:** No job queue complexity, acceptable for MVP volume
- **Pattern:** Fire-and-forget with error logging
  ```typescript
  // Don't await, let it run in background
  sendEmailNotification(user, contract).catch(err =>
    console.error('[EMAIL] Failed:', err)
  );
  ```
- **Future:** Consider BullMQ if volume increases

---

## External Service Integrations

### Stripe Integration (Epic 5)

**Purpose:** Subscription billing at £9/month

**Architecture:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Server    │────▶│   Stripe    │
│  (React)    │     │  (Express)  │     │    API      │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Webhooks   │
                    │  /stripe    │
                    └─────────────┘
```

**Key Endpoints:**
- `POST /api/subscriptions/create-checkout` - Create Stripe Checkout session
- `POST /api/subscriptions/portal` - Customer portal for management
- `POST /api/webhooks/stripe` - Handle subscription events

**Database Schema:**
```sql
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
-- Values: 'inactive', 'active', 'past_due', 'canceled'
ALTER TABLE users ADD COLUMN subscription_ends_at TIMESTAMP;
```

**Webhook Events to Handle:**
- `checkout.session.completed` - Activate subscription
- `customer.subscription.updated` - Status changes
- `customer.subscription.deleted` - Cancellation
- `invoice.payment_failed` - Payment issues

---

### OpenAI Integration (Epic 2)

**Purpose:** AI-powered contract analysis

**Architecture:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Contract   │────▶│  pdf-parse  │────▶│   OpenAI    │
│   Upload    │     │  (Extract)  │     │   GPT-4     │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Analysis   │
                                        │   Result    │
                                        └─────────────┘
```

**API Configuration:**
```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const analysis = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: MUSIC_CONTRACT_SYSTEM_PROMPT },
    { role: 'user', content: contractText }
  ],
  temperature: 0.3, // Lower for consistent analysis
  max_tokens: 2000
});
```

**Analysis Response Structure:**
```typescript
interface ContractAnalysis {
  summary: string;
  keyTerms: {
    term: string;
    value: string;
    risk: 'low' | 'medium' | 'high';
  }[];
  redFlags: {
    issue: string;
    severity: 'warning' | 'critical';
    recommendation: string;
  }[];
  missingClauses: string[];
  overallRisk: 'low' | 'medium' | 'high';
}
```

**Cost Control:**
- Rate limit: 10 analyses per hour per user
- Token monitoring via usage API
- Truncate very long contracts (>50k chars)

---

### Postmark Integration (Epics 1, 4, 7)

**Purpose:** Transactional email notifications

**Email Types:**
| Template | Trigger | Epic |
|----------|---------|------|
| Welcome | User registration | 1 |
| Password Reset | Reset request | 1 |
| Email Verification | Registration | 1 |
| Signature Request | Contract sent | 4 |
| Signature Complete | All parties signed | 4 |
| Signature Reminder | 3 days before expiry | 4 |
| Proposal Received | New proposal | 7 |

**Configuration:**
```typescript
import postmark from 'postmark';

const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

await client.sendEmailWithTemplate({
  From: 'noreply@aermuse.com',
  To: user.email,
  TemplateAlias: 'signature-request',
  TemplateModel: {
    userName: user.name,
    contractTitle: contract.title,
    signingLink: `${BASE_URL}/sign/${signatureToken}`
  }
});
```

---

### DocuSeal Integration (Epic 4)

**Purpose:** E-signature functionality

**Architecture:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Aermuse   │────▶│  DocuSeal   │────▶│  Signed     │
│   Server    │     │  (Replit)   │     │   PDF       │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   ▼
       │            ┌─────────────┐
       └───────────▶│  Webhooks   │
                    └─────────────┘
```

**Deployment:** Separate Replit project running DocuSeal Docker container

**Environment Variables (DocuSeal Replit):**
```
DATABASE_URL=postgresql://...
SECRET_KEY_BASE=<generated-secret>
```

**Integration Pattern:**
```typescript
const DOCUSEAL_URL = process.env.DOCUSEAL_URL;
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY;

// Create submission (signature request)
const response = await fetch(`${DOCUSEAL_URL}/api/submissions`, {
  method: 'POST',
  headers: {
    'X-Auth-Token': DOCUSEAL_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    template_id: templateId,
    submitters: [
      { email: 'signer@example.com', role: 'Signer' }
    ]
  })
});
```

**Webhook Events:**
- `submission.completed` - All parties signed
- `submission.expired` - Request expired

**UK E-Signature Compliance:**
- Audit trail with timestamps
- Intent to sign (checkbox confirmation)
- Signer identification (email verification)
- Document integrity (hash verification)

---

### Replit Object Storage (Epics 2, 8)

**Purpose:** Store uploaded contracts and signed PDFs

**Structure:**
```
/contracts
  /{userId}
    /{contractId}
      /original.pdf
      /signed.pdf
      /analysis.json
```

**Usage Pattern:**
```typescript
import { Client } from '@replit/object-storage';

const storage = new Client();

// Upload
await storage.uploadFromBuffer(
  `contracts/${userId}/${contractId}/original.pdf`,
  pdfBuffer,
  { contentType: 'application/pdf' }
);

// Download
const { data } = await storage.downloadAsBuffer(
  `contracts/${userId}/${contractId}/original.pdf`
);
```

---

## Database Schema Extensions

### New Tables

```sql
-- Session storage (ADR-004)
CREATE TABLE user_sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX idx_session_expire ON user_sessions(expire);

-- Contract templates (Epic 3)
CREATE TABLE contract_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  fields JSONB DEFAULT '[]',
  optional_clauses JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contract folders (Epic 8)
CREATE TABLE contract_folders (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contract versions (Epic 8)
CREATE TABLE contract_versions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id VARCHAR NOT NULL REFERENCES contracts(id),
  version INTEGER NOT NULL,
  content JSONB,
  changed_by VARCHAR REFERENCES users(id),
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Signature requests (Epic 4)
CREATE TABLE signature_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id VARCHAR NOT NULL REFERENCES contracts(id),
  signer_email TEXT NOT NULL,
  signer_name TEXT,
  signer_role TEXT,
  status TEXT DEFAULT 'pending',
  -- Values: pending, viewed, signed, declined, expired
  token VARCHAR UNIQUE NOT NULL,
  docuseal_submission_id TEXT,
  signed_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Proposals (Epic 7)
CREATE TABLE proposals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id VARCHAR NOT NULL REFERENCES landing_pages(id),
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  company TEXT,
  proposal_type TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  -- Values: new, viewed, responded, archived
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin activity log (Epic 6)
CREATE TABLE admin_activity_log (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id VARCHAR NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id VARCHAR,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Table Modifications

```sql
-- Users table extensions
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN subscription_ends_at TIMESTAMP;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN email_verification_token VARCHAR;
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR;
ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP;

-- Contracts table extensions
ALTER TABLE contracts ADD COLUMN folder_id VARCHAR REFERENCES contract_folders(id);
ALTER TABLE contracts ADD COLUMN template_id VARCHAR REFERENCES contract_templates(id);
ALTER TABLE contracts ADD COLUMN ai_analysis JSONB;
ALTER TABLE contracts ADD COLUMN file_path TEXT;
ALTER TABLE contracts ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE contracts ADD COLUMN signing_status TEXT DEFAULT 'draft';
-- Values: draft, pending_signatures, partially_signed, fully_signed
```

---

## Cross-Cutting Concerns

### Error Handling

**API Error Response Format:**
```typescript
interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string>;
}

// Express error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors
    });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.status(500).json({ error: 'Internal server error' });
});
```

**Client Error Boundaries:**
```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</ErrorBoundary>
```

### Logging

**Format:** `[LEVEL] [TIMESTAMP] [CONTEXT] Message`

**Examples:**
```
[INFO] 2025-01-15T10:30:00Z [AUTH] User login: user@example.com
[ERROR] 2025-01-15T10:31:00Z [STRIPE] Webhook verification failed
[WARN] 2025-01-15T10:32:00Z [AI] Rate limit approaching for user_123
```

**Rules:**
- Never log passwords, tokens, or full credit card numbers
- Log user IDs, not emails, in production
- Include request IDs for tracing

### Authentication Middleware

```typescript
// Require authenticated user
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Require admin role
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, req.session.userId)
  });

  if (user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

// Require active subscription
export const requireSubscription = async (req: Request, res: Response, next: NextFunction) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.session.userId)
  });

  if (user?.subscription_status !== 'active') {
    return res.status(403).json({
      error: 'Active subscription required',
      code: 'SUBSCRIPTION_REQUIRED'
    });
  }

  next();
};
```

### API Response Format

```typescript
// Success response
interface SuccessResponse<T> {
  data: T;
}

// Paginated response
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper functions
export const success = <T>(data: T): SuccessResponse<T> => ({ data });

export const paginated = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> => ({
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }
});
```

---

## Project Structure

```
/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/        # Shared UI components
│   │   │   ├── contracts/     # Contract-related components
│   │   │   ├── templates/     # Template selection/filling
│   │   │   ├── signing/       # E-signature components
│   │   │   ├── billing/       # Subscription/payment UI
│   │   │   └── admin/         # Admin dashboard components
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Contracts.tsx
│   │   │   ├── ContractView.tsx
│   │   │   ├── Templates.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Subscription.tsx
│   │   │   ├── SignDocument.tsx  # Public signing page
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.tsx
│   │   │       ├── AdminUsers.tsx
│   │   │       ├── AdminContracts.tsx
│   │   │       └── AdminTemplates.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useContracts.ts
│   │   │   └── useSubscription.ts
│   │   ├── lib/
│   │   │   ├── api.ts          # API client
│   │   │   └── utils.ts
│   │   └── App.tsx
│   └── index.html
│
├── server/
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── contracts.ts
│   │   ├── templates.ts
│   │   ├── signing.ts
│   │   ├── subscriptions.ts
│   │   ├── proposals.ts
│   │   ├── admin.ts
│   │   └── webhooks.ts
│   ├── services/
│   │   ├── openai.ts          # AI analysis service
│   │   ├── stripe.ts          # Payment service
│   │   ├── postmark.ts        # Email service
│   │   ├── docuseal.ts        # E-signing service
│   │   └── storage.ts         # File storage service
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rateLimit.ts
│   │   └── validation.ts
│   ├── db/
│   │   ├── schema.ts          # Drizzle schema
│   │   └── migrations/
│   └── index.ts
│
├── shared/
│   └── types.ts               # Shared TypeScript types
│
└── docs/
    ├── architecture.md        # This document
    ├── epics/                 # Epic specifications
    └── ...
```

---

## Epic-to-Architecture Mapping

| Epic | Key Services | New Routes | DB Changes |
|------|--------------|------------|------------|
| EPIC-001 Auth | bcrypt, Postmark | `/auth/*` | users table extensions |
| EPIC-002 AI | OpenAI, pdf-parse, Storage | `/contracts/analyze` | ai_analysis column |
| EPIC-003 Templates | - | `/templates/*` | contract_templates table |
| EPIC-004 E-Signing | DocuSeal, Postmark, pdf-lib | `/signing/*` | signature_requests table |
| EPIC-005 Billing | Stripe | `/subscriptions/*`, `/webhooks/stripe` | subscription columns |
| EPIC-006 Admin | - | `/admin/*` | admin_activity_log table |
| EPIC-007 Landing | Postmark | `/proposals/*` | proposals table |
| EPIC-008 Storage | Storage, pdf-lib | existing routes enhanced | folders, versions tables |

---

## Security Considerations

### Authentication
- Passwords hashed with bcrypt (cost 12)
- Session cookies: httpOnly, secure, sameSite
- CSRF protection via sameSite cookies
- Rate limiting on auth endpoints

### Authorization
- Role-based access (user, admin)
- Subscription status checks for premium features
- Contract ownership verification

### Data Protection
- Sensitive data never logged
- File access scoped to user
- Signed URLs for file downloads
- Input validation with Zod

### External Services
- API keys in environment variables
- Webhook signature verification
- HTTPS for all external calls

---

## Implementation Sequence

### Phase 1: Foundation (EPIC-001, EPIC-005)
1. Authentication security improvements (bcrypt, email verification)
2. Stripe subscription integration
3. Session management upgrade

### Phase 2: Core Features (EPIC-002, EPIC-004)
1. File upload and storage
2. OpenAI integration for contract analysis
3. DocuSeal integration for e-signing

### Phase 3: Content (EPIC-003, EPIC-008)
1. Contract template system
2. Folder organization
3. Search and filtering
4. PDF export

### Phase 4: Operations (EPIC-006, EPIC-007)
1. Admin dashboard
2. Landing page proposals
3. Activity logging

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Session
SESSION_SECRET=<generated-secret>

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# OpenAI
OPENAI_API_KEY=sk-...

# Postmark
POSTMARK_API_KEY=...

# DocuSeal
DOCUSEAL_URL=https://docuseal-<project>.replit.app
DOCUSEAL_API_KEY=...

# Application
BASE_URL=https://aermuse.replit.app
NODE_ENV=production
```

---

## Success Metrics

From PRD, to be tracked via admin dashboard:
- 50+ active subscribers at £9/month
- 200+ contracts uploaded or created
- 100+ e-signatures completed
- NPS > 30
- Monthly churn < 10%

---

*Generated: 2025-11-28*
*Methodology: BMad Method - Brownfield Track*
