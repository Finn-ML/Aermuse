# Architecture - Client (Web Frontend)

## Overview

The client is a React Single Page Application (SPA) built with Vite, serving as the user-facing interface for the Aermuse artist management platform.

## Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| Framework | React 18.3.1 | Component-based UI library |
| Build Tool | Vite 5.4.20 | Fast HMR and optimized production builds |
| Language | TypeScript 5.6.3 | Type-safe development |
| Styling | TailwindCSS 3.4.17 | Utility-first CSS |
| UI Components | Radix UI + shadcn/ui | Accessible component primitives |
| State Management | TanStack Query 5.60.5 | Server state and caching |
| Routing | Wouter 3.3.5 | Lightweight client-side routing |
| Forms | react-hook-form + Zod | Form handling with validation |
| 3D Graphics | Three.js 0.181.2 | WebGL shader animations |
| Animation | Framer Motion 11.13.1 | UI animations |

## Directory Structure

```
client/
├── index.html                 # HTML entry point
├── public/
│   └── favicon.png           # Site favicon
└── src/
    ├── main.tsx              # React bootstrap
    ├── App.tsx               # Root component with routing
    ├── index.css             # Global styles + Tailwind
    ├── components/
    │   ├── ui/               # shadcn/ui components (49 files)
    │   ├── ShaderAnimation.tsx
    │   └── GrainOverlay.tsx
    ├── pages/
    │   ├── Landing.tsx       # Public landing page
    │   ├── Auth.tsx          # Login/Register page
    │   ├── Dashboard.tsx     # Main authenticated UI
    │   └── not-found.tsx     # 404 page
    ├── lib/
    │   ├── auth.tsx          # AuthContext + hooks
    │   ├── queryClient.ts    # TanStack Query config
    │   └── utils.ts          # Utility functions
    └── hooks/
        ├── use-mobile.tsx    # Mobile detection
        └── use-toast.ts      # Toast notifications
```

## Architecture Pattern

**Component-Based Architecture** with the following layers:

1. **Pages** - Route-level components containing page logic
2. **Components** - Reusable UI components (shadcn/ui library)
3. **Hooks** - Custom React hooks for shared logic
4. **Lib** - Utilities, contexts, and API client

## State Management

### Server State (TanStack Query)
- Handles API data fetching, caching, and synchronization
- Configured with `staleTime: Infinity` for aggressive caching
- Custom `apiRequest` wrapper for authenticated requests

```typescript
// Query configuration (lib/queryClient.ts)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});
```

### Client State (React Context)
- **AuthContext** - User authentication state, login/logout/register methods
- Component-level state with `useState` for UI interactions

## Routing

Routes defined in `App.tsx` using Wouter:

| Route | Component | Auth Required |
|-------|-----------|---------------|
| `/` | Landing | No |
| `/auth` | Auth | No (redirects if logged in) |
| `/dashboard` | Dashboard | Yes |
| `*` | NotFound | No |

## API Integration

All API calls go through `lib/queryClient.ts`:

```typescript
// Standard API request pattern
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response>
```

- Credentials included for session cookies
- Automatic error handling with toast notifications
- Query invalidation for cache updates after mutations

## Key Components

### ShaderAnimation (`components/ShaderAnimation.tsx`)
- Custom Three.js WebGL shader for visual effects
- Two variants: `landing` and `auth`
- Graceful fallback for non-WebGL browsers
- GLSL fragment shaders with burgundy/cream color palette

### GrainOverlay (`components/GrainOverlay.tsx`)
- SVG-based noise filter overlay
- Fixed position across all pages
- Adds texture/grain effect to the design

### Dashboard (`pages/Dashboard.tsx`)
- Main authenticated interface
- Three tabs: Dashboard overview, Contract Manager, Landing Page builder
- Uses TanStack Query mutations for all CRUD operations

## Design System

See [Design Guidelines](../design_guidelines.md) for complete design documentation.

**Key Design Tokens:**
- Primary: `#660033` (Burgundy)
- Background: `#F7E6CA` (Cream)
- Font: Nunito (200-800 weights)
- Border Radius: 12-50px range

## Build Configuration

### Vite Config (`vite.config.ts`)
- Path aliases: `@` -> `client/src`, `@shared` -> `shared`
- Output: `dist/public`
- Replit plugins for dev environment

### TypeScript Config
- Strict mode enabled
- Module resolution: bundler
- JSX: preserve (handled by Vite)

## Performance Considerations

- **Code splitting**: Vite automatic chunk splitting
- **Query caching**: Aggressive caching with TanStack Query
- **WebGL**: Fallback gradients for unsupported browsers
- **Lazy loading**: Route-based code splitting possible

## Security

- HttpOnly cookies for session tokens
- No sensitive data in client-side state
- Form validation with Zod schemas
- CSRF protection via SameSite cookies

---
*Generated: 2025-11-28 | Part: client | Type: web*
