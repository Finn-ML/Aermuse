# Aermuse - Project Overview

## Executive Summary

**Aermuse** is an artist management platform designed to empower independent musicians with professional tools for contract management, fan engagement, and online presence. The platform combines AI-powered contract analysis with customizable landing pages and fan relationship management.

## Project Classification

| Attribute | Value |
|-----------|-------|
| **Project Name** | Aermuse (rest-express) |
| **Repository Type** | Multi-part |
| **Primary Language** | TypeScript |
| **Architecture Pattern** | Full-stack SPA with REST API |

## Project Structure

```
aermuse/
├── client/           # React SPA Frontend (web)
├── server/           # Express.js API Backend (backend)
└── shared/           # Shared TypeScript schemas (library)
```

## Parts Summary

### Client (Web Frontend)
- **Type**: Web SPA
- **Framework**: React 18 + Vite
- **UI Library**: Radix UI + shadcn/ui + TailwindCSS
- **State Management**: TanStack Query + React Context
- **Routing**: Wouter
- **Special Features**: Three.js WebGL shader animations

### Server (API Backend)
- **Type**: REST API
- **Framework**: Express.js
- **Authentication**: Session-based with express-session
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL (Neon Serverless)

### Shared (Library)
- **Type**: Shared schemas
- **Contents**: Drizzle schema definitions + Zod validation schemas

## Technology Stack Summary

| Category | Technology | Version |
|----------|------------|---------|
| Frontend Framework | React | 18.3.1 |
| Build Tool | Vite | 5.4.20 |
| Backend Framework | Express | 4.21.2 |
| Database | PostgreSQL | Neon Serverless |
| ORM | Drizzle ORM | 0.39.1 |
| Styling | TailwindCSS | 3.4.17 |
| Language | TypeScript | 5.6.3 |
| 3D Graphics | Three.js | 0.181.2 |

## Key Features

1. **User Authentication** - Session-based login/registration with Passport-style flow
2. **Contract Management** - CRUD operations for music industry contracts
3. **AI Contract Analysis** - Simulated AI analysis for contract risk assessment
4. **Artist Landing Pages** - Customizable public pages with link management
5. **Dashboard** - Stats overview, contract tracking, upcoming events

## Architecture Highlights

- **Monolithic deployment** - Single server serves both API and client
- **Session-based auth** - httpOnly cookies with MemoryStore (dev) or PostgreSQL (prod)
- **Type-safe full stack** - Shared schemas between frontend and backend
- **WebGL visual effects** - Custom GLSL shaders for brand visual identity

## Entry Points

| Part | Entry Point | Description |
|------|-------------|-------------|
| Client | `client/src/main.tsx` | React application bootstrap |
| Server | `server/index.ts` | Express server initialization |
| Shared | `shared/schema.ts` | Database schema definitions |

## Related Documentation

- [Architecture - Client](./architecture-client.md)
- [Architecture - Server](./architecture-server.md)
- [API Contracts](./api-contracts.md)
- [Data Models](./data-models.md)
- [Development Guide](./development-guide.md)
- [Design Guidelines](../design_guidelines.md) (existing)

---
*Generated: 2025-11-28 | Scan Level: Exhaustive*
