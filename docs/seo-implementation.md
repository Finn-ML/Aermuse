# SEO Implementation for Artist Pages

> Server-side meta tag injection and search engine optimization for `/artist/:slug` routes

## Overview

Artist pages are public-facing landing pages that need to be discoverable by search engines and shareable on social media. This implementation provides:

1. **Server-side meta tag injection** - Dynamic meta tags rendered at request time
2. **Sitemap generation** - Automatic XML sitemap for all published pages
3. **robots.txt** - Crawler directives
4. **JSON-LD structured data** - Schema.org markup for rich snippets
5. **Open Graph / Twitter Cards** - Social sharing previews

## Architecture

### Request Flow for Artist Pages

```
Browser/Crawler requests /artist/slug
         │
         ▼
    Express Static Middleware
         │
         ▼ (no static file match)
    Catch-all Handler (server/static.ts)
         │
         ├─── Is /artist/:slug route?
         │         │
         │         ▼ YES
         │    Fetch artist from DB
         │         │
         │         ▼
         │    Generate meta tags
         │         │
         │         ▼
         │    Inject into HTML template
         │         │
         │         ▼
         │    Serve modified HTML
         │
         └─── NO ──► Serve default index.html
```

## Endpoints

### GET /robots.txt

Returns crawler directives:

```
User-agent: *
Allow: /artist/
Allow: /api/artist/
Allow: /api/landing-page/avatar/
Allow: /api/landing-page/background-image/
Allow: /api/landing-page/background-video/
Disallow: /dashboard
Disallow: /admin
Disallow: /api/admin/
Disallow: /api/analytics/
Disallow: /api/auth/
Disallow: /api/contracts/
Disallow: /api/folders/
Disallow: /api/landing-page
Disallow: /api/proposals/
Disallow: /api/signatures/
Disallow: /api/templates/
Disallow: /api/user/

Sitemap: https://yourdomain.com/sitemap.xml
```

### GET /sitemap.xml

Dynamically generates XML sitemap including:
- Homepage
- All published artist landing pages with `lastmod` dates

Example response:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yourdomain.com</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://yourdomain.com/artist/artist-slug</loc>
    <lastmod>2025-01-20</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

## Meta Tags Injected

For artist pages, the following meta tags are dynamically injected:

| Tag | Content |
|-----|---------|
| `<title>` | "Artist Name - Tagline \| AERMUSE" |
| `<meta name="description">` | Artist bio (truncated to 160 chars) |
| `<link rel="canonical">` | Full canonical URL |
| `<meta property="og:type">` | "profile" |
| `<meta property="og:title">` | Artist name |
| `<meta property="og:description">` | Bio or tagline |
| `<meta property="og:image">` | Avatar or cover image URL |
| `<meta property="og:url">` | Canonical URL |
| `<meta property="og:site_name">` | "AERMUSE" |
| `<meta name="twitter:card">` | "summary_large_image" |
| `<meta name="twitter:title">` | Artist name |
| `<meta name="twitter:description">` | Bio or tagline |
| `<meta name="twitter:image">` | Avatar or cover image URL |

## JSON-LD Structured Data

Client-side injection of Schema.org MusicGroup markup:

```json
{
  "@context": "https://schema.org",
  "@type": "MusicGroup",
  "name": "Artist Name",
  "description": "Artist bio",
  "image": "https://example.com/avatar.jpg",
  "url": "https://example.com/artist/slug",
  "sameAs": [
    "https://instagram.com/artist",
    "https://twitter.com/artist"
  ]
}
```

## Files Modified

| File | Purpose |
|------|---------|
| `server/routes.ts` | robots.txt and sitemap.xml endpoints |
| `server/storage.ts` | `getAllPublishedLandingPages()` method |
| `server/static.ts` | Meta tag injection for artist routes |
| `client/index.html` | SEO placeholder markers |
| `client/src/pages/ArtistPage.tsx` | JSON-LD structured data injection |

## HTML Template Markers

The `client/index.html` file contains placeholder markers:

```html
<!-- SEO_META_TAGS -->
<title>AERMUSE - Artist Management Platform</title>
<meta name="description" content="..." />
<!-- /SEO_META_TAGS -->
```

These markers are replaced at request time with artist-specific meta tags for `/artist/:slug` routes.

## Verification

### Test Meta Tags
```bash
curl -s https://yourdomain.com/artist/artist-slug | grep -E '<(title|meta|link)'
```

### Test Sitemap
```bash
curl https://yourdomain.com/sitemap.xml
```

### Test robots.txt
```bash
curl https://yourdomain.com/robots.txt
```

### Validation Tools
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- Google Search Console - Submit sitemap

## Security Considerations

- All user-provided content (artist name, bio, tagline) is HTML-escaped before injection
- Only published pages are included in sitemap and receive meta tag injection
- Unpublished pages fall back to default generic HTML
