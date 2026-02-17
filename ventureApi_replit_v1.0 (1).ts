import type { Express } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";

/**
 * VentureAPI Routes
 *
 * Backend API endpoint for exposing user metrics to external applications.
 *
 * ============================================================================
 * QUICK START (TL;DR)
 * ============================================================================
 *
 * 1. Copy this file to: server/routes/ventureApiRoutes.ts
 * 2. Update imports (lines 2-4) to match your project structure
 * 3. Add to .env: VentureAPI=your-secret-key
 * 4. In your routes file, add:
 *    import { setupVentureApiRoutes } from "./routes/ventureApiRoutes";
 *    setupVentureApiRoutes(app);
 * 5. Restart server and test:
 *    curl http://localhost:3000/api/ventureapi -H "Authorization: Bearer YOUR_KEY"
 *
 * ============================================================================
 * IMPORTANT: This is a BACKEND/SERVER-SIDE module for Node.js
 * ============================================================================
 *
 * This module creates API endpoints that run on a Node.js server using a
 * backend web framework like Express, Fastify, or Koa. It CANNOT run directly
 * in React or frontend applications.
 *
 * - ✅ Works with: Express, Fastify, Koa, Hono, or any Node.js backend framework
 * - ❌ Does NOT work with: React (frontend), Next.js client components, browsers
 * - 💡 React apps can CALL this API endpoint using fetch/axios
 *
 * ============================================================================
 * REQUIREMENTS
 * ============================================================================
 *
 * 1. Node.js Backend Framework:
 *    - Express.js (shown in examples)
 *    - OR Fastify, Koa, Hono (see adaptation examples below)
 *
 * 2. Database Setup:
 *    - PostgreSQL database
 *    - Drizzle ORM configured
 *    - Users table with these columns:
 *      - id (string/uuid)
 *      - isActive (boolean) - true for active users, false for leads
 *      - lastLoginAt (date/timestamp) - tracks user login activity
 *
 * 3. Environment Variables:
 *    - VentureAPI=your-secret-api-key-here //Get the key from the environment variables, never hardcode it in the code
 *
 * ============================================================================
 * SETUP INSTRUCTIONS
 * ============================================================================
 *
 * Step 1: Copy this file to your project
 *    Typical project structure:
 *
 *    your-project/
 *    ├── server/
 *    │   ├── index.ts              (or app.ts - main entry point)
 *    │   ├── db.ts                 (Drizzle database instance)
 *    │   ├── routes.ts             (main routes file - EDIT THIS)
 *    │   └── routes/
 *    │       └── ventureApiRoutes.ts  ⬅️ COPY THIS FILE HERE
 *    ├── shared/
 *    │   └── schema.ts             (Database schema with users table)
 *    ├── .env                      (Environment variables)
 *    └── package.json
 *
 * Step 2: Update imports to match your project structure
 *    - Change "../db" to point to your Drizzle database instance
 *    - Change "@shared/schema" to point to your users table definition
 *
 * Step 3: Add environment variable to your .env file
 *    VentureAPI=your-secret-api-key-here
 *
 * Step 4: Register the routes in your server (see detailed examples below)
 *
 * ============================================================================
 * INTEGRATION WITH EXISTING PROJECT
 * ============================================================================
 *
 * Most projects will add this to an EXISTING server. Here's how:
 *
 * --- Option A: Add to Main Routes File (Recommended) ---
 *
 * If you have a main routes file like server/routes.ts or server/routes/index.ts:
 *
 * 1. Add the import at the top with your other route imports:
 *
 *    import { setupUserRoutes } from "./userRoutes";
 *    import { setupAuthRoutes } from "./authRoutes";
 *    import { setupVentureApiRoutes } from "./ventureApiRoutes";  // ADD THIS
 *
 * 2. Call the function where you register other routes (usually inside a
 *    registerRoutes or setupRoutes function):
 *
 *    export function registerRoutes(app: Express) {
 *      // ... your existing route registrations ...
 *
 *      // VentureAPI routes - external metrics API
 *      setupVentureApiRoutes(app);  // ADD THIS
 *
 *      // ... more route registrations ...
 *    }
 *
 * 3. Restart your server and test the endpoint
 *
 * --- Option B: Add Directly to Server Entry Point ---
 *
 * If you setup routes directly in server/index.ts or app.ts:
 *
 * 1. Add the import near the top:
 *
 *    import express from "express";
 *    import { setupVentureApiRoutes } from "./routes/ventureApiRoutes";
 *
 * 2. Call the function after creating your Express app but before app.listen():
 *
 *    const app = express();
 *    app.use(express.json());
 *
 *    // Register VentureAPI routes
 *    setupVentureApiRoutes(app);
 *
 *    app.listen(3000, () => {
 *      console.log("Server running on port 3000");
 *    });
 *
 * ⚠️ IMPORTANT: Register VentureAPI routes BEFORE any catch-all routes (like
 *    wildcard handlers or SPA fallbacks), otherwise they may not be reachable.
 *
 * ============================================================================
 * USAGE EXAMPLES FOR OTHER FRAMEWORKS
 * ============================================================================
 *
 * --- Fastify Example ---
 *
 * If using Fastify, you'll need to adapt the route handler:
 *
 * export function setupVentureApiRoutes(fastify: FastifyInstance) {
 *   fastify.get('/api/ventureapi', async (request, reply) => {
 *     const apiKey = request.headers.authorization?.replace('Bearer ', '') ||
 *                    request.headers['x-api-key'];
 *     // ... rest of logic
 *     return reply.send({ status: "success", response: { ... } });
 *   });
 * }
 *
 * --- Koa Example ---
 *
 * If using Koa, you'll need to adapt the route handler:
 *
 * import Router from '@koa/router';
 *
 * export function setupVentureApiRoutes(router: Router) {
 *   router.get('/api/ventureapi', async (ctx) => {
 *     const apiKey = ctx.headers.authorization?.replace('Bearer ', '') ||
 *                    ctx.headers['x-api-key'];
 *     // ... rest of logic
 *     ctx.body = { status: "success", response: { ... } };
 *   });
 * }
 *
 * ============================================================================
 * API ENDPOINT DOCUMENTATION
 * ============================================================================
 *
 * Endpoint: GET /api/ventureapi
 *
 * Authentication: API Key via one of:
 *   - Header: Authorization: Bearer YOUR_API_KEY
 *   - Header: x-api-key: YOUR_API_KEY
 *
 * Success Response (200):
 * {
 *   "status": "success",
 *   "response": {
 *     "users": 21,         // Total active users (isActive = true)
 *     "activeusers": 7,    // Users who logged in within last 30 days
 *     "leads": 0           // Inactive users (isActive = false)
 *   }
 * }
 *
 * Error Responses:
 * - 401: { "status": "error", "message": "Unauthorized: Invalid API key" }
 * - 500: { "status": "error", "message": "API key not configured" }
 * - 500: { "status": "error", "message": "Failed to fetch user metrics" }
 *
 * ============================================================================
 * CALLING FROM REACT/FRONTEND
 * ============================================================================
 *
 * React or other frontend apps should call this API endpoint using fetch/axios:
 *
 * // In your React component or service file:
 * const fetchMetrics = async () => {
 *   const response = await fetch('https://your-api.com/api/ventureapi', {
 *     headers: {
 *       'Authorization': 'Bearer YOUR_API_KEY'
 *     }
 *   });
 *   const data = await response.json();
 *   console.log(data.response); // { users, activeusers, leads }
 * };
 *
 * ⚠️ SECURITY NOTE: Never expose your VentureAPI key in frontend code!
 *    Frontend apps should call through your own backend proxy endpoint.
 *
 * ============================================================================
 * DATABASE SCHEMA REQUIREMENTS
 * ============================================================================
 *
 * Your users table must have these columns:
 *
 * CREATE TABLE users (
 *   id UUID PRIMARY KEY,
 *   email VARCHAR(255) NOT NULL,
 *   is_active BOOLEAN DEFAULT true,      -- Required: true = active user, false = lead
 *   last_login_at TIMESTAMP,             -- Required: tracks user activity
 *   created_at TIMESTAMP DEFAULT NOW(),
 *   updated_at TIMESTAMP DEFAULT NOW()
 * );
 *
 * If your column names are different, update the queries in the code below.
 *
 * ============================================================================
 * TESTING THE ENDPOINT
 * ============================================================================
 *
 * After setup, test the endpoint to verify it works:
 *
 * 1. Start your server:
 *    npm run dev    (or your start command)
 *
 * 2. Test with curl:
 *    curl -X GET http://localhost:3000/api/ventureapi \
 *      -H "Authorization: Bearer YOUR_API_KEY"
 *
 *    Or using x-api-key header:
 *    curl -X GET http://localhost:3000/api/ventureapi \
 *      -H "x-api-key: YOUR_API_KEY"
 *
 * 3. Expected success response:
 *    {"status":"success","response":{"users":21,"activeusers":7,"leads":0}}
 *
 * 4. Test error handling (wrong key):
 *    curl -X GET http://localhost:3000/api/ventureapi \
 *      -H "Authorization: Bearer wrong-key"
 *
 *    Expected: {"status":"error","message":"Unauthorized: Invalid API key"}
 *
 * ============================================================================
 * DEPENDENCIES
 * ============================================================================
 *
 * This module requires these npm packages:
 *
 * npm install express drizzle-orm pg
 * npm install --save-dev @types/express @types/node
 *
 * Make sure your package.json includes:
 * - express: ^4.18.0 or higher
 * - drizzle-orm: ^0.28.0 or higher
 * - pg (PostgreSQL driver): ^8.11.0 or higher
 *
 * ============================================================================
 * TROUBLESHOOTING
 * ============================================================================
 *
 * Problem: "Cannot find module '../db'"
 * Solution: Update the import path to match your project structure.
 *          Check where your Drizzle db instance is exported.
 *
 * Problem: "Cannot find module '@shared/schema'"
 * Solution: Update the import path to your users table definition.
 *          If using a different alias, update the import accordingly.
 *
 * Problem: "API key not configured" (500 error)
 * Solution: Ensure VentureAPI environment variable is set in your .env file.
 *          Restart your server after adding environment variables.
 *
 * Problem: "Unauthorized: Invalid API key" (401 error)
 * Solution: Check that the API key in your request header matches the
 *          VentureAPI environment variable exactly (no extra spaces).
 *
 * Problem: Endpoint returns 404
 * Solution: - Verify setupVentureApiRoutes(app) is called before app.listen()
 *          - Check that the function is called before catch-all routes
 *          - Ensure server restarted after adding the routes
 *
 * Problem: Database query errors
 * Solution: - Verify your users table has isActive and lastLoginAt columns
 *          - Check database connection is working
 *          - Update column names in queries if your schema is different
 *
 * Problem: TypeScript errors on Express types
 * Solution: npm install --save-dev @types/express @types/node
 *
 * ============================================================================
 * CUSTOMIZATION
 * ============================================================================
 *
 * To customize the metrics or add new endpoints:
 *
 * 1. Active user window (currently 30 days):
 *    Change line: thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
 *    To use 7 days: thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 7);
 *
 * 2. Add more metrics:
 *    Add new database queries and include them in the response object
 *
 * 3. Change endpoint path:
 *    Change app.get('/api/ventureapi', ...) to your preferred path
 *
 * 4. Add rate limiting (recommended for production):
 *    npm install express-rate-limit
 *    import rateLimit from 'express-rate-limit';
 *
 *    const apiLimiter = rateLimit({
 *      windowMs: 15 * 60 * 1000, // 15 minutes
 *      max: 100 // limit each API key to 100 requests per window
 *    });
 *    app.get('/api/ventureapi', apiLimiter, async (req, res) => { ... });
 *
 */
export function setupVentureApiRoutes(app: Express) {
  // VentureAPI endpoint - returns user metrics
  app.get('/api/ventureapi', async (req, res) => {
    try {
      // Verify API key
      const apiKey = req.headers['authorization']?.replace('Bearer ', '') || req.headers['x-api-key'];
      const ventureApiSecret = process.env.VentureAPI;

      if (!ventureApiSecret) {
        console.error('VentureAPI: VentureAPI secret not configured in environment');
        return res.status(500).json({
          status: 'error',
          message: 'API key not configured'
        });
      }

      if (!apiKey || apiKey !== ventureApiSecret) {
        console.warn('VentureAPI: Unauthorized access attempt');
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized: Invalid API key'
        });
      }

      // Calculate date 30 days ago for active user count
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get total user count
      const totalUsersResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.isActive, true));

      const totalUsers = totalUsersResult[0]?.count || 0;

      // Get active user count (users who logged in within last 30 days)
      const activeUsersResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(
          and(
            eq(users.isActive, true),
            gte(users.lastLoginAt, thirtyDaysAgo)
          )
        );

      const activeUsers = activeUsersResult[0]?.count || 0;

      // Get leads count (inactive or pending users)
      const leadsResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.isActive, false));

      const leads = leadsResult[0]?.count || 0;

      return res.json({
        status: "success",
        response: {
          users: totalUsers,
          activeusers: activeUsers,
          leads: leads
        }
      });
    } catch (error: any) {
      console.error("VentureAPI error:", error);
      return res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : "Failed to fetch user metrics"
      });
    }
  });
}
