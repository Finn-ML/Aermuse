# Source Tree Analysis

## Project Root

```
aermuse/
├── .bmad/                     # BMad workflow configuration
├── .cache/                    # Bun cache
├── .claude/                   # Claude Code configuration
├── .cursor/                   # Cursor editor settings
├── .replit                    # Replit configuration
├── client/                    # Frontend React application
├── docs/                      # Project documentation
├── migrations/                # Database migrations
├── node_modules/              # Dependencies
├── server/                    # Backend Express API
├── shared/                    # Shared code/schemas
├── attached_assets/           # Asset files
├── cookies.txt                # Development cookies
├── design_guidelines.md       # UI/UX design system
├── drizzle.config.ts          # Drizzle ORM config
├── package.json               # Project manifest
├── package-lock.json          # Dependency lock file
├── replit.md                  # Platform overview
├── tailwind.config.ts         # Tailwind CSS config
├── tsconfig.json              # TypeScript config
└── vite.config.ts             # Vite build config
```

## Client Directory (`client/`)

```
client/
├── index.html                 # HTML entry point
├── public/
│   └── favicon.png           # Site favicon
└── src/
    ├── main.tsx              # React bootstrap & QueryClient provider
    ├── App.tsx               # Root component with routing
    ├── index.css             # Global styles + Tailwind imports
    │
    ├── components/
    │   ├── GrainOverlay.tsx  # Visual grain effect overlay
    │   ├── ShaderAnimation.tsx # Three.js WebGL shaders
    │   └── ui/               # shadcn/ui component library
    │       ├── accordion.tsx
    │       ├── alert.tsx
    │       ├── alert-dialog.tsx
    │       ├── aspect-ratio.tsx
    │       ├── avatar.tsx
    │       ├── badge.tsx
    │       ├── breadcrumb.tsx
    │       ├── button.tsx
    │       ├── calendar.tsx
    │       ├── card.tsx
    │       ├── carousel.tsx
    │       ├── chart.tsx
    │       ├── checkbox.tsx
    │       ├── collapsible.tsx
    │       ├── command.tsx
    │       ├── context-menu.tsx
    │       ├── dialog.tsx
    │       ├── drawer.tsx
    │       ├── dropdown-menu.tsx
    │       ├── form.tsx
    │       ├── hover-card.tsx
    │       ├── input.tsx
    │       ├── input-otp.tsx
    │       ├── label.tsx
    │       ├── menubar.tsx
    │       ├── navigation-menu.tsx
    │       ├── pagination.tsx
    │       ├── popover.tsx
    │       ├── progress.tsx
    │       ├── radio-group.tsx
    │       ├── resizable.tsx
    │       ├── scroll-area.tsx
    │       ├── select.tsx
    │       ├── separator.tsx
    │       ├── sheet.tsx
    │       ├── sidebar.tsx
    │       ├── skeleton.tsx
    │       ├── slider.tsx
    │       ├── sonner.tsx
    │       ├── switch.tsx
    │       ├── table.tsx
    │       ├── tabs.tsx
    │       ├── textarea.tsx
    │       ├── toast.tsx
    │       ├── toaster.tsx
    │       ├── toggle.tsx
    │       ├── toggle-group.tsx
    │       └── tooltip.tsx
    │
    ├── pages/
    │   ├── Landing.tsx       # Public marketing landing page
    │   ├── Auth.tsx          # Login/Register page
    │   ├── Dashboard.tsx     # Main authenticated interface
    │   └── not-found.tsx     # 404 page
    │
    ├── lib/
    │   ├── auth.tsx          # AuthContext & authentication hooks
    │   ├── queryClient.ts    # TanStack Query configuration
    │   └── utils.ts          # Utility functions (cn, etc.)
    │
    └── hooks/
        ├── use-mobile.tsx    # Mobile detection hook
        └── use-toast.ts      # Toast notification hook
```

## Server Directory (`server/`)

```
server/
├── index.ts      # Application entry point
│                 # - Express app creation
│                 # - Session middleware configuration
│                 # - Body parser setup
│                 # - Request logging
│                 # - Error handling
│                 # - Server startup
│
├── routes.ts     # API route definitions
│                 # - Auth routes (/api/auth/*)
│                 # - Contract routes (/api/contracts/*)
│                 # - Landing page routes (/api/landing-page/*)
│                 # - Password hashing function
│
├── storage.ts    # Data access layer
│                 # - IStorage interface definition
│                 # - DatabaseStorage class implementation
│                 # - All CRUD operations
│
├── db.ts         # Database connection
│                 # - Neon serverless pool
│                 # - Drizzle ORM instance
│                 # - WebSocket configuration
│
├── vite.ts       # Vite dev server integration
│                 # - Development middleware
│                 # - HMR support
│
└── static.ts     # Static file serving
                  # - Production asset serving
                  # - SPA fallback routing
```

## Shared Directory (`shared/`)

```
shared/
└── schema.ts     # Database schema definitions
                  # - users table
                  # - contracts table
                  # - landingPages table
                  # - landingPageLinks table
                  # - Zod validation schemas
                  # - TypeScript type exports
```

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, project metadata |
| `tsconfig.json` | TypeScript compiler options, path aliases |
| `vite.config.ts` | Vite build configuration, plugins, aliases |
| `tailwind.config.ts` | Tailwind CSS customization, design tokens |
| `drizzle.config.ts` | Drizzle ORM/Kit configuration |
| `.replit` | Replit platform configuration |

## Key File Purposes

### Entry Points
- **Client**: `client/src/main.tsx` → React app bootstrap
- **Server**: `server/index.ts` → Express server startup

### Core Business Logic
- **Authentication**: `server/routes.ts` (auth routes), `client/src/lib/auth.tsx`
- **Contracts**: `server/routes.ts` (contract routes), `client/src/pages/Dashboard.tsx`
- **Landing Pages**: `server/routes.ts`, `client/src/pages/Dashboard.tsx`

### Data Layer
- **Schema**: `shared/schema.ts`
- **Queries**: `server/storage.ts`
- **Client State**: `client/src/lib/queryClient.ts`

### Visual/UI
- **Design System**: `design_guidelines.md`, `tailwind.config.ts`
- **Components**: `client/src/components/ui/*`
- **Special Effects**: `ShaderAnimation.tsx`, `GrainOverlay.tsx`

## File Statistics

| Category | Count |
|----------|-------|
| TypeScript files (`.ts/.tsx`) | ~60 |
| UI Components | 49 |
| Pages | 4 |
| Server modules | 5 |
| Config files | 5 |

---
*Generated: 2025-11-28 | Exhaustive Scan*
