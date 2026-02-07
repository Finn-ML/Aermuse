---
name: visual-playwright
description: Hybrid browser automation combining Playwright's speed and parallelism with visual screenshot feedback. Use when tasks need browser interaction with visual awareness — testing UIs, exploring pages, verifying layouts, or any browser automation where seeing the page matters. Replaces the need for a browser extension while giving Claude visual context. Works in parallel across multiple instances.
---

# Visual Playwright

A hybrid browser automation skill that gives Claude Code visual awareness of web pages while using Playwright for fast, reliable, parallelisable browser control.

## When to Use This Skill

- Testing UI features across multiple dev servers in parallel
- Exploring unfamiliar UIs where you need to see what's on screen
- Verifying visual layout, styling, or responsive behaviour
- Any browser automation where Claude needs to see the page to decide what to do next
- Running browser tests alongside agent teams (no Chrome extension conflicts)

## When NOT to Use This Skill

- Pure API testing (use curl/fetch instead)
- Simple HTTP checks (use curl)
- When you already have deterministic Playwright tests written (just run them)
- Static content extraction (use fetch + parse)

## Setup

Before first use, ensure Playwright is installed in the project:

```bash
npm install -D playwright @playwright/test
npx playwright install chromium
```

If the project doesn't have a `package.json`, initialise one first:

```bash
npm init -y
npm install -D playwright @playwright/test
npx playwright install chromium
```

## Core Pattern: Screenshot → Reason → Act

The fundamental loop is:

1. **Navigate** to a URL using Playwright
2. **Screenshot** the page (saved to a temp file)
3. **View** the screenshot (Claude sees the image)
4. **Reason** about what's visible and decide the next action
5. **Act** using Playwright (click, fill, scroll, etc.)
6. **Screenshot** again to verify the result
7. **Repeat** until the task is complete

### Using the Helper Script

The skill includes `scripts/vp.mjs` — a lightweight Node.js helper that wraps Playwright with a simple command interface. Run it from the terminal:

```bash
# Navigate and screenshot
node scripts/vp.mjs goto "http://localhost:3000" --screenshot shots/home.png

# Click an element and screenshot the result
node scripts/vp.mjs click "button.submit" --screenshot shots/after-click.png

# Fill a form field
node scripts/vp.mjs fill "#email" "test@example.com" --screenshot shots/filled.png

# Type into the focused element
node scripts/vp.mjs type "Hello world"

# Select from a dropdown
node scripts/vp.mjs select "#country" "United Kingdom"

# Scroll down and screenshot
node scripts/vp.mjs scroll down 500 --screenshot shots/scrolled.png

# Wait for a specific element to appear
node scripts/vp.mjs wait "#loading-complete" --screenshot shots/loaded.png

# Get all text content from the page (for quick non-visual checks)
node scripts/vp.mjs text

# Get the page title
node scripts/vp.mjs title

# Evaluate arbitrary JS in the page
node scripts/vp.mjs eval "document.querySelectorAll('.item').length"

# Take a full-page screenshot (not just viewport)
node scripts/vp.mjs screenshot shots/fullpage.png --fullpage

# Close the browser session
node scripts/vp.mjs close
```

### Important: Session Persistence

The helper uses a **persistent browser session** via a WebSocket connection file (`.vp-session.json`). This means:

- The first command launches a browser and saves the connection info
- Subsequent commands reuse the same browser and page
- Navigation state, cookies, and auth persist across commands
- Run `node scripts/vp.mjs close` to clean up when done
- If the session goes stale, delete `.vp-session*.json` and it will start fresh
- The session automatically tracks which page is active (avoids the about:blank bug)

### SPA / React / Vite Hydration

The `goto` command automatically waits for SPA hydration — it doesn't just wait for the HTML to load, it waits until the page has meaningful rendered content (text or DOM elements). This handles React, Vue, Svelte, Next.js, Vite, and similar frameworks without needing manual `wait` calls after navigation.

After `goto`, the command prints a DOM sanity check so you can verify the page rendered:

```
🌐 Navigated to: http://localhost:3001/auth
   DOM: 47 elements, 3241 chars
```

If you see `DOM: 0 elements, 0 chars`, the page didn't hydrate — check your dev server.

### Debugging Commands

```bash
# Check what page the session is connected to
node scripts/vp.mjs status

# Get current URL
node scripts/vp.mjs url

# Get raw HTML of an element
node scripts/vp.mjs html "#app"

# Get attributes of an element
node scripts/vp.mjs attrs "button.submit"

# Get text content of a specific element (not full page)
node scripts/vp.mjs text ".error-message"
```

### Multiple Parallel Sessions

For running multiple browsers (e.g., testing 3 worktrees on different ports), use the `--session` flag:

```bash
# Session for worktree 1
node scripts/vp.mjs --session wt1 goto "http://localhost:3001"
node scripts/vp.mjs --session wt1 screenshot shots/wt1-home.png

# Session for worktree 2 (separate browser instance)
node scripts/vp.mjs --session wt2 goto "http://localhost:3002"
node scripts/vp.mjs --session wt2 screenshot shots/wt2-home.png

# Session for worktree 3
node scripts/vp.mjs --session wt3 goto "http://localhost:3003"
node scripts/vp.mjs --session wt3 screenshot shots/wt3-home.png

# Clean up all
node scripts/vp.mjs --session wt1 close
node scripts/vp.mjs --session wt2 close
node scripts/vp.mjs --session wt3 close
```

Each session gets its own `.vp-session-{name}.json` file and independent browser instance.

## Workflow Examples

### Example 1: Explore and Test a Feature

```
User: "Test the login flow on localhost:3001"

Claude's approach:
1. node scripts/vp.mjs goto "http://localhost:3001/login" --screenshot shots/01-login-page.png
2. [View shots/01-login-page.png] → Sees email/password fields, a "Sign In" button, "Forgot password" link
3. node scripts/vp.mjs fill "#email" "test@example.com"
4. node scripts/vp.mjs fill "#password" "password123" --screenshot shots/02-filled.png
5. [View shots/02-filled.png] → Confirms fields are filled
6. node scripts/vp.mjs click "button[type=submit]" --screenshot shots/03-after-submit.png
7. [View shots/03-after-submit.png] → Sees dashboard loaded, login successful
8. node scripts/vp.mjs close
```

### Example 2: Visual Regression Check

```
User: "Compare the header on port 3001 vs 3002"

Claude's approach:
1. node scripts/vp.mjs --session a goto "http://localhost:3001" --screenshot shots/header-a.png
2. node scripts/vp.mjs --session b goto "http://localhost:3002" --screenshot shots/header-b.png
3. [View both screenshots side by side]
4. Report differences observed
5. node scripts/vp.mjs --session a close
6. node scripts/vp.mjs --session b close
```

### Example 3: Agent Team with Visual Testing

```
Lead agent coordinates. Each teammate uses its own session:

Teammate 1 (auth features, port 3001):
  node scripts/vp.mjs --session auth goto "http://localhost:3001/login" --screenshot ...

Teammate 2 (dashboard, port 3002):
  node scripts/vp.mjs --session dash goto "http://localhost:3002/dashboard" --screenshot ...

Teammate 3 (settings, port 3003):
  node scripts/vp.mjs --session settings goto "http://localhost:3003/settings" --screenshot ...

No Chrome extension needed. No conflicts. Full visual awareness.
```

## Configuration Options

The helper accepts environment variables for customisation:

```bash
# Custom viewport size (default: 1280x720)
VP_WIDTH=1920 VP_HEIGHT=1080 node scripts/vp.mjs goto "http://localhost:3000"

# Use Firefox instead of Chromium
VP_BROWSER=firefox node scripts/vp.mjs goto "http://localhost:3000"

# Use WebKit (Safari)
VP_BROWSER=webkit node scripts/vp.mjs goto "http://localhost:3000"

# Headed mode (show the actual browser window for debugging)
VP_HEADLESS=false node scripts/vp.mjs goto "http://localhost:3000"

# Custom timeout (default: 30000ms)
VP_TIMEOUT=60000 node scripts/vp.mjs wait "#slow-element"

# Device emulation
VP_DEVICE="iPhone 13" node scripts/vp.mjs goto "http://localhost:3000" --screenshot shots/mobile.png
```

## Tips for Best Results

1. **Always screenshot after actions** — use `--screenshot` on every command that changes the page state. This is your visual feedback loop.

2. **Use descriptive filenames** — `shots/03-after-login.png` is better than `shots/s3.png`. It helps when reviewing the sequence later.

3. **Clean up sessions** — always `close` when done. Orphaned browser processes eat RAM.

4. **Use `text` for quick checks** — if you just need to verify text content exists, `vp.mjs text` is faster than a screenshot.

5. **Combine with curl** — for API-level checks, use curl alongside visual checks. Visual testing is for things you need to see.

6. **Screenshot directory** — create a `shots/` directory in your project. Add it to `.gitignore`.

7. **Mobile testing** — use `VP_DEVICE` for responsive testing. Playwright supports all common device profiles.

## Troubleshooting

**"Browser not found"** — Run `npx playwright install chromium` to download browser binaries.

**Stale session** — Delete `.vp-session*.json` files and try again.

**Timeout on wait** — Increase timeout with `VP_TIMEOUT=60000` or check if the selector is correct.

**Port conflicts** — Each `--session` flag creates a separate browser. Make sure your dev servers are on different ports.

**Screenshots are blank** — The page might not have loaded yet. Add a `wait` command for a key element before screenshotting.
