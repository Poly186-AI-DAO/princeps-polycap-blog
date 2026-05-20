import siteMetadata from '@/src/utils/siteMetaData';
import { getAllBlogs } from '@/src/lib/blogs';

const STATIC_PATHS = ['/', '/about', '/contact', '/categories/all'];

const toAbsoluteUrl = (path) => new URL(path, siteMetadata.siteUrl).toString();

const normalizeDate = (value) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const getSitemapEntries = async () => {
  const staticEntries = STATIC_PATHS.map((path) => ({
    url: toAbsoluteUrl(path),
    lastModified: new Date(),
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
