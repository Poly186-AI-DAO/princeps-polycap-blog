import siteMetadata from '@/src/utils/siteMetaData';
import { getAllBlogs } from '@/src/lib/blogs';

const STATIC_PATHS = ['/', '/about', '/contact', '/categories/all'];

const toAbsoluteUrl = (path) => new URL(path, siteMetadata.siteUrl).toString();

const normalizeDate = (value) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const toIso = (value) => normalizeDate(value).toISOString();

export const getSitemapEntries = async () => {
  const staticEntries = STATIC_PATHS.map((path) => ({
    url: toAbsoluteUrl(path),
    lastModified: normalizeDate(new Date()),
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }));

  const blogs = await getAllBlogs();

  const blogEntries = blogs
    .filter((blog) => blog?.slug)
    .map((blog) => ({
      url: toAbsoluteUrl(`/blogs/${blog.slug}`),
      lastModified: normalizeDate(blog.updatedAt || blog.publishedAt),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

  const deduped = new Map();
  [...staticEntries, ...blogEntries].forEach((entry) => {
    deduped.set(entry.url, entry);
  });

  return Array.from(deduped.values());
};

export const toSitemapXml = (entries = []) => {
  const urls = entries
    .map((entry) => {
      const changeFrequency = entry.changeFrequency || 'weekly';
      const priority = Number.isFinite(entry.priority) ? entry.priority : 0.7;
      return `  <url>\n    <loc>${entry.url}</loc>\n    <lastmod>${toIso(entry.lastModified)}</lastmod>\n    <changefreq>${changeFrequency}</changefreq>\n    <priority>${priority.toFixed(1)}</priority>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
};
