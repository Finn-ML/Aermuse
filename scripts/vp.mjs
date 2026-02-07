#!/usr/bin/env node

/**
 * Visual Playwright (vp.mjs) v0.2.0
 * 
 * A persistent browser automation helper for Claude Code.
 * Combines Playwright's speed with visual screenshot feedback.
 * 
 * Usage: node scripts/vp.mjs [--session name] <command> [args] [--screenshot path] [--fullpage]
 * 
 * Commands:
 *   goto <url>                    Navigate to URL (waits for SPA hydration)
 *   click <selector>              Click an element
 *   fill <selector> <value>       Fill an input field
 *   type <text>                   Type into focused element
 *   select <selector> <value>     Select dropdown option
 *   scroll <direction> [pixels]   Scroll up/down/left/right
 *   wait <selector>               Wait for element to appear
 *   text [selector]               Get text content (default: body)
 *   title                         Get page title
 *   url                           Get current URL
 *   eval <expression>             Evaluate JS in page context
 *   html [selector]               Get innerHTML (default: body)
 *   attrs <selector>              Get element attributes
 *   screenshot <path> [--fullpage] Take a screenshot
 *   close                         Close browser session
 *   status                        Check if session is alive
 */

import { chromium, firefox, webkit, devices } from 'playwright';
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

// --- Config from env ---
const CONFIG = {
  browser: process.env.VP_BROWSER || 'chromium',
  headless: process.env.VP_HEADLESS !== 'false',
  width: parseInt(process.env.VP_WIDTH) || 1280,
  height: parseInt(process.env.VP_HEIGHT) || 720,
  timeout: parseInt(process.env.VP_TIMEOUT) || 30000,
  device: process.env.VP_DEVICE || null,
};

// --- Parse args ---
const args = process.argv.slice(2);
let sessionName = 'default';
let commandArgs = [...args];

const sessionIdx = commandArgs.indexOf('--session');
if (sessionIdx !== -1) {
  sessionName = commandArgs[sessionIdx + 1];
  commandArgs.splice(sessionIdx, 2);
}

let screenshotPath = null;
const ssIdx = commandArgs.indexOf('--screenshot');
if (ssIdx !== -1) {
  screenshotPath = commandArgs[ssIdx + 1];
  commandArgs.splice(ssIdx, 2);
}

let fullPage = false;
const fpIdx = commandArgs.indexOf('--fullpage');
if (fpIdx !== -1) {
  fullPage = true;
  commandArgs.splice(fpIdx, 1);
}

const command = commandArgs[0];
const commandArgsRest = commandArgs.slice(1);

const sessionFile = sessionName === 'default'
  ? '.vp-session.json'
  : `.vp-session-${sessionName}.json`;

// --- Session management ---

function getSessionInfo() {
  try {
    if (existsSync(sessionFile)) {
      return JSON.parse(readFileSync(sessionFile, 'utf-8'));
    }
  } catch { /* corrupted */ }
  return null;
}

function saveSessionInfo(info) {
  writeFileSync(sessionFile, JSON.stringify(info, null, 2));
}

function clearSession() {
  try { if (existsSync(sessionFile)) unlinkSync(sessionFile); } catch { /* ignore */ }
}

function getBrowserType() {
  switch (CONFIG.browser) {
    case 'firefox': return firefox;
    case 'webkit': return webkit;
    default: return chromium;
  }
}

/**
 * Find the active page — the one that ISN'T about:blank.
 * Falls back to the last page if all are blank.
 */
function findActivePage(pages) {
  if (pages.length === 0) return null;
  const navigated = pages.find(p => p.url() !== 'about:blank');
  return navigated || pages[pages.length - 1];
}

async function launchBrowser() {
  const browserType = getBrowserType();

  // Use launchPersistentContext to keep state across invocations
  const userDataDir = resolve(`.vp-data-${sessionName}`);
  mkdirSync(userDataDir, { recursive: true });

  let contextOptions = {
    headless: CONFIG.headless,
    viewport: { width: CONFIG.width, height: CONFIG.height },
  };

  if (CONFIG.device && devices[CONFIG.device]) {
    contextOptions = { ...contextOptions, ...devices[CONFIG.device] };
  }

  const context = await browserType.launchPersistentContext(userDataDir, contextOptions);
  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();
  page.setDefaultTimeout(CONFIG.timeout);

  saveSessionInfo({
    userDataDir,
    sessionName,
    browser: CONFIG.browser,
    startedAt: new Date().toISOString(),
    mode: 'persistent',
  });

  return { browser: null, context, page, server: null };
}

async function connectToSession() {
  const info = getSessionInfo();
  if (!info) return null;

  // With persistent context mode, we just relaunch with the same data dir
  // The browser state (cookies, localStorage, etc.) persists on disk
  if (info.mode === 'persistent') {
    try {
      const browserType = getBrowserType();

      let contextOptions = {
        headless: CONFIG.headless,
        viewport: { width: CONFIG.width, height: CONFIG.height },
      };

      if (CONFIG.device && devices[CONFIG.device]) {
        contextOptions = { ...contextOptions, ...devices[CONFIG.device] };
      }

      const context = await browserType.launchPersistentContext(info.userDataDir, contextOptions);
      const pages = context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();
      page.setDefaultTimeout(CONFIG.timeout);

      // Restore last URL if saved
      if (info.lastUrl && info.lastUrl !== 'about:blank') {
        await page.goto(info.lastUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await waitForSPAHydration(page).catch(() => {});
      }

      return { browser: null, context, page, server: null };
    } catch (e) {
      clearSession();
      return null;
    }
  }

  // Legacy WebSocket mode (fallback)
  try {
    const browserType = getBrowserType();
    const browser = await browserType.connect(info.wsEndpoint);
    const contexts = browser.contexts();

    if (contexts.length === 0) {
      clearSession();
      return null;
    }

    const context = contexts[0];
    const pages = context.pages();
    let page = findActivePage(pages);

    if (!page) {
      page = await context.newPage();
    }

    page.setDefaultTimeout(CONFIG.timeout);
    return { browser, context, page, server: null };
  } catch (e) {
    clearSession();
    return null;
  }
}

async function getOrCreateSession() {
  let session = await connectToSession();
  if (session) return session;
  return await launchBrowser();
}

// --- SPA-aware navigation ---

async function waitForSPAHydration(page, timeoutMs = 10000) {
  try {
    await page.waitForFunction(() => {
      const body = document.body;
      if (!body) return false;
      const text = body.innerText?.trim() || '';
      const childCount = body.querySelectorAll('*').length;
      return text.length > 10 || childCount > 5;
    }, { timeout: timeoutMs });
  } catch {
    // Timeout OK — page might be intentionally sparse
  }
  await page.waitForTimeout(500);
}

// --- Screenshot helper ---

async function takeScreenshot(page, path, fullPage = false) {
  const dir = dirname(resolve(path));
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: resolve(path), fullPage });
  console.log(`📸 Screenshot saved: ${path}`);
}

// --- Command handlers ---

async function handleCommand() {
  if (!command) {
    console.log(`Visual Playwright v0.2.0 — Hybrid browser automation for Claude Code

Usage: node vp.mjs [--session name] <command> [args] [--screenshot path]

Commands:
  goto <url>                    Navigate to URL (SPA-aware)
  click <selector>              Click an element  
  fill <selector> <value>       Fill an input field
  type <text>                   Type into focused element
  select <selector> <value>     Select dropdown option
  scroll <direction> [pixels]   Scroll up/down/left/right
  wait <selector>               Wait for element to appear
  text [selector]               Get text content (default: body)
  title                         Get page title
  url                           Get current URL
  eval <expression>             Run JS in page context
  html [selector]               Get innerHTML (default: body)
  attrs <selector>              Get element attributes
  screenshot <path> [--fullpage] Take a screenshot
  close                         Close browser session
  status                        Check session status

Options:
  --session <n>              Named session (for parallel browsers)
  --screenshot <path>           Screenshot after command
  --fullpage                    Full page screenshot

Env vars:
  VP_BROWSER=chromium|firefox|webkit  (default: chromium)
  VP_HEADLESS=true|false              (default: true)
  VP_WIDTH=1280 VP_HEIGHT=720         Viewport size
  VP_TIMEOUT=30000                    Timeout in ms
  VP_DEVICE="iPhone 13"               Device emulation`);
    process.exit(0);
  }

  // --- Close ---
  if (command === 'close') {
    const info = getSessionInfo();
    if (info && info.mode === 'persistent' && info.userDataDir) {
      // Clean up persistent data dir
      const { rmSync } = await import('fs');
      try { rmSync(info.userDataDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    const session = await connectToSession();
    if (session) {
      try {
        if (session.context) await session.context.close();
        else if (session.server) await session.server.close();
        else if (session.browser) await session.browser.close();
      } catch { /* ignore */ }
    }
    clearSession();
    console.log(`🔒 Session "${sessionName}" closed.`);
    return;
  }

  // --- Status ---
  if (command === 'status') {
    const session = await connectToSession();
    if (session) {
      const pages = session.context.pages();
      const urls = pages.map(p => p.url());
      console.log(`✅ Session "${sessionName}" is active.`);
      console.log(`   Pages (${pages.length}): ${urls.join(', ')}`);
      console.log(`   Active: ${findActivePage(pages)?.url() || 'none'}`);
    } else {
      console.log(`❌ Session "${sessionName}" is not active.`);
    }
    return;
  }

  // All other commands need a session
  const { browser, context, page, server } = await getOrCreateSession();

  try {
    switch (command) {
      case 'goto': {
        const url = commandArgsRest[0];
        if (!url) throw new Error('Usage: goto <url>');
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await waitForSPAHydration(page);
        const actualUrl = page.url();
        console.log(`🌐 Navigated to: ${actualUrl}`);
        const bodyLen = await page.evaluate(() => document.body?.innerHTML?.length || 0);
        const elCount = await page.evaluate(() => document.body?.querySelectorAll('*').length || 0);
        console.log(`   DOM: ${elCount} elements, ${bodyLen} chars`);
        break;
      }

      case 'click': {
        const selector = commandArgsRest[0];
        if (!selector) throw new Error('Usage: click <selector>');
        await page.click(selector);
        await page.waitForTimeout(300);
        console.log(`🖱️  Clicked: ${selector}`);
        break;
      }

      case 'fill': {
        const selector = commandArgsRest[0];
        const value = commandArgsRest.slice(1).join(' ');
        if (!selector || value === '') throw new Error('Usage: fill <selector> <value>');
        await page.fill(selector, value);
        console.log(`✏️  Filled "${selector}" with "${value}"`);
        break;
      }

      case 'type': {
        const text = commandArgsRest.join(' ');
        if (!text) throw new Error('Usage: type <text>');
        await page.keyboard.type(text);
        console.log(`⌨️  Typed: "${text}"`);
        break;
      }

      case 'select': {
        const selector = commandArgsRest[0];
        const value = commandArgsRest.slice(1).join(' ');
        if (!selector || !value) throw new Error('Usage: select <selector> <value>');
        await page.selectOption(selector, value);
        console.log(`📋 Selected "${value}" in ${selector}`);
        break;
      }

      case 'scroll': {
        const direction = commandArgsRest[0] || 'down';
        const pixels = parseInt(commandArgsRest[1]) || 500;
        const scrollMap = {
          down: [0, pixels],
          up: [0, -pixels],
          right: [pixels, 0],
          left: [-pixels, 0],
        };
        const [x, y] = scrollMap[direction] || [0, pixels];
        await page.mouse.wheel(x, y);
        await page.waitForTimeout(300);
        console.log(`📜 Scrolled ${direction} ${pixels}px`);
        break;
      }

      case 'wait': {
        const selector = commandArgsRest[0];
        if (!selector) throw new Error('Usage: wait <selector>');
        await page.waitForSelector(selector, { state: 'visible' });
        console.log(`✅ Element visible: ${selector}`);
        break;
      }

      case 'text': {
        const selector = commandArgsRest[0] || 'body';
        const text = await page.innerText(selector);
        console.log(text);
        break;
      }

      case 'title': {
        const title = await page.title();
        console.log(`📄 Title: ${title}`);
        break;
      }

      case 'url': {
        console.log(page.url());
        break;
      }

      case 'html': {
        const selector = commandArgsRest[0] || 'body';
        const html = await page.innerHTML(selector);
        console.log(html);
        break;
      }

      case 'attrs': {
        const selector = commandArgsRest[0];
        if (!selector) throw new Error('Usage: attrs <selector>');
        const attrs = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const result = {};
          for (const attr of el.attributes) {
            result[attr.name] = attr.value;
          }
          result._tag = el.tagName.toLowerCase();
          result._text = el.textContent?.slice(0, 200);
          return result;
        }, selector);
        if (attrs) {
          console.log(JSON.stringify(attrs, null, 2));
        } else {
          console.log(`❌ No element found: ${selector}`);
        }
        break;
      }

      case 'eval': {
        const expression = commandArgsRest.join(' ');
        if (!expression) throw new Error('Usage: eval <expression>');
        const result = await page.evaluate(expression);
        if (typeof result === 'string') {
          console.log(result);
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
        break;
      }

      case 'screenshot': {
        const path = commandArgsRest[0];
        if (!path) throw new Error('Usage: screenshot <path>');
        await takeScreenshot(page, path, fullPage);
        break;
      }

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.error('Run without arguments to see usage.');
        process.exit(1);
    }

    // Post-command screenshot if requested
    if (screenshotPath) {
      await takeScreenshot(page, screenshotPath, fullPage);
    }

    // Save last URL for session restore
    const info = getSessionInfo();
    if (info) {
      info.lastUrl = page.url();
      saveSessionInfo(info);
    }

    // Close the browser — persistent context saves state to disk
    if (context) await context.close().catch(() => {});

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

handleCommand().catch(err => {
  console.error(`❌ Fatal: ${err.message}`);
  process.exit(1);
});
