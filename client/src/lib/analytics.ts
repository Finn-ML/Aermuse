// Client-side analytics tracking for landing pages (Epic 10)

// Session ID management (stored in sessionStorage)
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('aermuse_session');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('aermuse_session', sessionId);
  }
  return sessionId;
}

// Track page view - call on landing page mount
export async function trackPageView(landingPageId: string): Promise<string | null> {
  const sessionId = getOrCreateSessionId();
  if (!sessionId) return null;

  try {
    const res = await fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        landingPageId,
        sessionId,
        referrer: document.referrer || null,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.pageViewId;
  } catch {
    return null;
  }
}

// Track page end - call on page unload/visibility change
export function trackPageEnd(pageViewId: string): void {
  if (!pageViewId) return;

  const body = JSON.stringify({
    endedAt: new Date().toISOString(),
  });

  // Use sendBeacon for reliable delivery on page unload
  const sent = navigator.sendBeacon(
    `/api/analytics/pageview/${pageViewId}/end`,
    new Blob([body], { type: 'application/json' })
  );

  // Fallback to fetch if sendBeacon fails
  if (!sent) {
    fetch(`/api/analytics/pageview/${pageViewId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

// Track link click - call when visitor clicks a link
export function trackLinkClick(
  linkId: string,
  landingPageId: string,
  pageViewId?: string | null
): void {
  const sessionId = getOrCreateSessionId();
  if (!sessionId) return;

  // Fire and forget - don't block the navigation
  fetch('/api/analytics/click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      linkId,
      landingPageId,
      pageViewId: pageViewId || null,
      sessionId,
    }),
    keepalive: true,
  }).catch(() => {});
}
