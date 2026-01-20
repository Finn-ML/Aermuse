import express, { type Express, type Request } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import type { LandingPage } from "@shared/schema";

/**
 * Get the base URL from the request for constructing canonical URLs.
 */
function getBaseUrl(req: Request): string {
  const origin = req.get('origin');
  if (origin) {
    return origin;
  }
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host');
  if (host) {
    return `${protocol}://${host}`;
  }
  return process.env.APP_URL || process.env.BASE_URL || 'http://localhost:5000';
}

/**
 * Truncate text to a maximum length for meta descriptions
 */
function truncateText(text: string | null | undefined, maxLength: number = 160): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3).trim() + '...';
}

/**
 * Escape HTML special characters for safe attribute values
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate SEO meta tags for an artist page
 */
function generateArtistMetaTags(page: LandingPage, baseUrl: string): string {
  const artistName = escapeHtml(page.artistName);
  const tagline = escapeHtml(page.tagline);
  const bio = escapeHtml(truncateText(page.bio, 160));
  const canonicalUrl = `${baseUrl}/artist/${page.slug}`;
  const ogImage = page.avatarUrl || page.coverImageUrl || `${baseUrl}/favicon.png`;

  // Build title: "Artist Name - Tagline | AERMUSE" or "Artist Name | AERMUSE"
  const title = tagline
    ? `${artistName} - ${tagline} | AERMUSE`
    : `${artistName} | AERMUSE`;

  // Build description: bio or tagline or default
  const description = bio || tagline || `Check out ${artistName}'s official page on AERMUSE.`;

  return `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonicalUrl}" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${artistName}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta property="og:site_name" content="AERMUSE" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    <meta name="twitter:title" content="${artistName}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
    `;
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Read the HTML template once at startup
  const indexHtmlPath = path.resolve(distPath, "index.html");
  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (but not for API routes)
  app.use("*", async (req, res, next) => {
    // Skip API routes - they should return 404 JSON, not HTML
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(404).json({ error: "Not found" });
    }

    // Check if this is an artist page route
    const artistMatch = req.originalUrl.match(/^\/artist\/([^/?#]+)/);

    if (artistMatch) {
      const slug = artistMatch[1];
      try {
        const page = await storage.getLandingPageBySlug(slug);

        if (page && page.isPublished) {
          const baseUrl = getBaseUrl(req);
          const metaTags = generateArtistMetaTags(page, baseUrl);

          // Replace the placeholder tags with artist-specific meta tags
          const modifiedHtml = indexHtml.replace(
            /<!-- SEO_META_TAGS -->[\s\S]*?<!-- \/SEO_META_TAGS -->/,
            `<!-- SEO_META_TAGS -->${metaTags}<!-- /SEO_META_TAGS -->`
          );

          return res.type('text/html').send(modifiedHtml);
        }
      } catch (error) {
        console.error('[SEO] Error fetching artist page for meta injection:', error);
        // Fall through to serve default HTML
      }
    }

    // For all other routes, serve the original HTML
    res.type('text/html').send(indexHtml);
  });
}
