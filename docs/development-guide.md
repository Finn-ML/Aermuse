# Development Guide

## Prerequisites

- Node.js 18+
- npm or bun
- PostgreSQL database (Neon account or local PostgreSQL)

## Environment Setup

### 1. Clone and Install Dependencies

```bash
# Install dependencies
npm install
# or
bun install
```

### 2. Environment Variables

Create a `.env` file or set environment variables:

```bash
# Required
DATABASE_URL="postgresql://user:pass@host:5432/database?sslmode=require"

# Optional
SESSION_SECRET="your-secret-key-for-sessions"
NODE_ENV="development"
PORT="5000"
```

### 3. Database Setup

```bash
# Push schema to database
npm run db:push
```

## Development Server

### Start Development Mode

```bash
npm run dev
```

This starts:
- Express server on `http://localhost:5000`
- Vite dev server with HMR for the client
- TypeScript compilation via TSX

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start development server |
| `build` | `npm run build` | Build for production |
| `start` | `npm run start` | Start production server |
| `db:push` | `npm run db:push` | Push schema to database |
| `check` | `npm run check` | TypeScript type checking |

## Project Structure

```
.
├── client/               # React frontend
│   ├── index.html
│   └── src/
│       ├── main.tsx     # Entry point
│       ├── App.tsx      # Root component
│       ├── components/  # Reusable components
│       ├── pages/       # Route pages
│       ├── lib/         # Utilities
│       └── hooks/       # Custom hooks
├── server/               # Express backend
│   ├── index.ts         # Server entry
│   ├── routes.ts        # API routes
│   └── storage.ts       # Data layer
├── shared/               # Shared code
│   └── schema.ts        # Database schema
├── docs/                 # Documentation
└── migrations/           # Database migrations
```

## Development Workflow

### Adding a New Feature

1. **Database Changes** (if needed)
   - Update `shared/schema.ts` with new tables/columns
   - Run `npm run db:push` to apply changes
   - Export new types

2. **Backend Implementation**
   - Add interface methods to `IStorage` in `storage.ts`
   - Implement methods in `DatabaseStorage` class
   - Add API routes in `routes.ts`

3. **Frontend Implementation**
   - Add queries/mutations in component or create custom hook
   - Create/update components
   - Add routing in `App.tsx` if needed

### Code Style

- TypeScript strict mode enabled
- Use Zod schemas for runtime validation
- Follow existing patterns for consistency
- Use TanStack Query for server state

## API Development

### Adding a New Endpoint

```typescript
// server/routes.ts

// 1. Protected endpoint pattern
app.get("/api/resource", async (req: Request, res: Response) => {
  try {
    // Check authentication
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get data
    const data = await storage.getResource(userId);
    res.json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to get resource" });
  }
});

// 2. With validation
app.post("/api/resource", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Validate input
    const data = insertResourceSchema.parse({
      ...req.body,
      userId,
    });

    const resource = await storage.createResource(data);
    res.json(resource);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to create resource" });
  }
});
```

## Frontend Development

### Creating a Query

```typescript
// Using TanStack Query
const { data, isLoading } = useQuery<ResourceType[]>({
  queryKey: ['/api/resource'],
  enabled: !!user,
});
```

### Creating a Mutation

```typescript
const mutation = useMutation({
  mutationFn: async (data: CreateResourceInput) => {
    const res = await apiRequest('POST', '/api/resource', data);
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/resource'] });
    toast({ title: "Created successfully" });
  },
  onError: () => {
    toast({ title: "Error", variant: "destructive" });
  },
});
```

### Adding a Component (shadcn/ui)

shadcn/ui components are in `client/src/components/ui/`. To add new ones:

```bash
# Visit https://ui.shadcn.com/docs/components
# Copy component code to client/src/components/ui/
```

## Database Management

### Drizzle ORM Queries

```typescript
// Select
const [user] = await db.select().from(users).where(eq(users.id, id));

// Insert
const [newUser] = await db.insert(users).values(userData).returning();

// Update
const [updated] = await db.update(users)
  .set({ name: "New Name" })
  .where(eq(users.id, id))
  .returning();

// Delete
await db.delete(users).where(eq(users.id, id));
```

### Schema Changes

1. Edit `shared/schema.ts`
2. Run `npm run db:push`
3. Drizzle Kit will show diff and apply changes

## Testing

Currently no automated tests configured. Consider adding:

- **Vitest** for unit tests
- **Playwright** or **Cypress** for E2E tests
- **Supertest** for API tests

## Building for Production

```bash
# Build client and server
npm run build

# Start production server
npm run start
```

**Build Output:**
- `dist/public/` - Built client files
- `dist/index.cjs` - Bundled server

## Common Issues

### Database Connection Errors
- Verify `DATABASE_URL` is set correctly
- Check Neon dashboard for connection details
- Ensure SSL mode is enabled (`?sslmode=require`)

### Session Not Persisting
- Check `SESSION_SECRET` is set
- Verify cookie settings for your environment
- In development, cookies require same-origin

### Vite HMR Not Working
- Check console for WebSocket errors
- Try clearing browser cache
- Restart dev server

## Recommended Tools

- **VS Code** with TypeScript extension
- **Drizzle Studio** for database GUI: `npx drizzle-kit studio`
- **Thunder Client** or **Postman** for API testing
- **React DevTools** browser extension

---
*Generated: 2025-11-28*
