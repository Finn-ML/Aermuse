# Architecture - Server (API Backend)

## Overview

The server is an Express.js REST API that handles authentication, data persistence, and serves the client application in production. It uses Drizzle ORM for database operations with PostgreSQL (Neon Serverless).

## Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| Framework | Express 4.21.2 | HTTP server and middleware |
| Runtime | Node.js | JavaScript runtime |
| Language | TypeScript 5.6.3 | Type-safe development |
| ORM | Drizzle ORM 0.39.1 | Type-safe database queries |
| Database | PostgreSQL (Neon) | Cloud-hosted relational DB |
| Session | express-session 1.18.1 | Session management |
| Validation | Zod 3.24.2 | Runtime type validation |
| Dev Server | TSX 4.20.5 | TypeScript execution |

## Directory Structure

```
server/
├── index.ts          # Application entry point
├── routes.ts         # API route definitions
├── storage.ts        # Data access layer (IStorage interface)
├── db.ts             # Database connection (Drizzle + Neon)
├── vite.ts           # Vite dev server integration
└── static.ts         # Static file serving (production)
```

## Architecture Pattern

**Layered Architecture** with clear separation:

1. **Routes Layer** (`routes.ts`) - HTTP handlers, request validation
2. **Storage Layer** (`storage.ts`) - Business logic, data access interface
3. **Database Layer** (`db.ts`) - Drizzle ORM connection

## Server Initialization Flow

```
server/index.ts
├── Create Express app
├── Configure session middleware (MemoryStore)
├── Configure body parsers (JSON, URL-encoded)
├── Add request logging middleware
├── Register API routes (routes.ts)
├── Add error handling middleware
├── Setup static serving OR Vite dev server
└── Start HTTP server on port 5000
```

## Session Configuration

```typescript
app.use(session({
  secret: process.env.SESSION_SECRET || "default-secret",
  resave: false,
  saveUninitialized: false,
  store: new MemoryStoreSession({
    checkPeriod: 86400000, // 24h pruning
  }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));
```

**Note**: MemoryStore is used for development. Production should use `connect-pg-simple` for PostgreSQL session storage.

## API Routes

### Authentication (`/api/auth/*`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new user account |
| POST | `/api/auth/login` | Authenticate user |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Get current user |

### Contracts (`/api/contracts/*`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contracts` | List user's contracts |
| GET | `/api/contracts/:id` | Get single contract |
| POST | `/api/contracts` | Create contract |
| PATCH | `/api/contracts/:id` | Update contract |
| DELETE | `/api/contracts/:id` | Delete contract |
| POST | `/api/contracts/:id/sign` | Sign contract |
| POST | `/api/contracts/:id/analyze` | AI analysis (simulated) |

### Landing Pages (`/api/landing-page/*`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/landing-page` | Get user's landing page |
| PATCH | `/api/landing-page` | Update landing page |
| GET | `/api/artist/:slug` | Public artist page |
| POST | `/api/landing-page/links` | Add link |
| PATCH | `/api/landing-page/links/:id` | Update link |
| DELETE | `/api/landing-page/links/:id` | Delete link |

## Data Access Layer

### IStorage Interface (`storage.ts`)

```typescript
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  // Contracts
  getContract(id: string): Promise<Contract | undefined>;
  getContractsByUser(userId: string): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, data: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: string): Promise<boolean>;

  // Landing Pages
  getLandingPage(id: string): Promise<LandingPage | undefined>;
  getLandingPageBySlug(slug: string): Promise<LandingPage | undefined>;
  getLandingPageByUser(userId: string): Promise<LandingPage | undefined>;
  createLandingPage(page: InsertLandingPage): Promise<LandingPage>;
  updateLandingPage(id: string, data: Partial<InsertLandingPage>): Promise<LandingPage | undefined>;

  // Landing Page Links
  getLandingPageLinks(landingPageId: string): Promise<LandingPageLink[]>;
  createLandingPageLink(link: InsertLandingPageLink): Promise<LandingPageLink>;
  updateLandingPageLink(id: string, data: Partial<InsertLandingPageLink>): Promise<LandingPageLink | undefined>;
  deleteLandingPageLink(id: string): Promise<boolean>;
}
```

### DatabaseStorage Implementation

The `DatabaseStorage` class implements `IStorage` using Drizzle ORM:

- All queries use Drizzle's type-safe query builder
- Returns Drizzle-inferred types from schema
- Automatic `updatedAt` timestamp handling

## Database Connection

```typescript
// db.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

**Key Points:**
- Uses Neon serverless driver with WebSocket support
- Connection pooling enabled
- Schema imported from `shared/schema.ts`

## Authentication Flow

1. **Registration**: Hash password (SHA-256), create user + default landing page
2. **Login**: Verify credentials, set `req.session.userId`
3. **Authentication Check**: Read `req.session.userId` on protected routes
4. **Logout**: Destroy session

**Security Note**: SHA-256 is used for simplicity. Production should use bcrypt.

## Error Handling

```typescript
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  throw err;
});
```

- Zod validation errors return 400 with error details
- Authentication failures return 401
- Not found returns 404
- Unhandled errors return 500

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | No | Session encryption key |
| `NODE_ENV` | No | Environment mode |
| `PORT` | No | Server port (default: 5000) |

## Production vs Development

### Development
- Vite dev server integration with HMR
- MemoryStore for sessions
- `tsx` for TypeScript execution

### Production
- ESBuild-bundled server (`dist/index.cjs`)
- Static file serving from `dist/public`
- Should use PostgreSQL session store

## Security Considerations

1. **Session Security**: httpOnly, secure (prod), 7-day expiry
2. **Password Hashing**: SHA-256 (should upgrade to bcrypt)
3. **Input Validation**: Zod schemas on all inputs
4. **Authorization**: User ownership checks on all resources
5. **CORS**: Not explicitly configured (same-origin deployment)

## Scalability Notes

- MemoryStore limits horizontal scaling (switch to Redis/PostgreSQL)
- Connection pooling via Neon's WebSocket driver
- Stateless API design allows load balancing

---
*Generated: 2025-11-28 | Part: server | Type: backend*
