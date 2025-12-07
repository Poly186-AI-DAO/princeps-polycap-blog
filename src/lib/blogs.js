import { blogs as fileBlogs } from '@/.velite/generated';
import GithubSlugger from 'github-slugger';
import readingTime from 'reading-time';
import Blog from '@/src/models/Blog';
import connectDB from './mongodb';

const FALLBACK_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlZWUiIC8+PC9zdmc+';

const FALLBACK_IMAGE = {
  src: '/social-banner.png',
  alt: 'Blog cover image',
  width: 1200,
  height: 630,
  blurDataURL: FALLBACK_BLUR,
};

const normalizeImage = (image = {}) => {
  return {
    src: image.src || image.url || FALLBACK_IMAGE.src,
    alt: image.alt || FALLBACK_IMAGE.alt,
    width: image.width || FALLBACK_IMAGE.width,
    height: image.height || FALLBACK_IMAGE.height,
    blurDataURL: image.blurDataURL || FALLBACK_IMAGE.blurDataURL,
  };
};

const buildTocFromContent = (content = '') => {
  const toc = [];
  const slugger = new GithubSlugger();

  content.split('\n').forEach((line) => {
    const match = /^(#{2,3})\s+(.*)/.exec(line.trim());
    if (!match) return;

    const level = match[1].length;
    const title = match[2].trim();
    const url = `#${slugger.slug(title)}`;

    if (level === 2) {
      toc.push({ title, url, items: [] });
    } else if (level === 3 && toc.length > 0) {
      const last = toc[toc.length - 1];
      last.items.push({ title, url, items: [] });
    }
  });

  return toc;
};

const normalizeDbBlog = (doc) => {
  const content = doc?.content || '';
  const reading = doc?.readingTime || readingTime(content || '');
  const publishedAt = doc?.publishedAt || doc?.createdAt || new Date();
  const updatedAt = doc?.updatedAt || publishedAt;

  return {
    id: doc?._id?.toString(),
    title: doc?.title || 'Untitled',
    slug: doc?.slug,
    description: doc?.description || '',
    content,
    author: doc?.author || 'Poly',
    tags: Array.isArray(doc?.tags) && doc.tags.length > 0 ? doc.tags : ['general'],
    status: doc?.status || 'draft',
    publishedAt: new Date(publishedAt).toISOString(),
    updatedAt: new Date(updatedAt).toISOString(),
    createdAt: doc?.createdAt
      ? new Date(doc.createdAt).toISOString()
      : new Date().toISOString(),
    url: `/blogs/${doc?.slug}`,
    image: normalizeImage(doc?.image),
    readingTime: {
      text: reading.text,
      minutes: reading.minutes,
      words: reading.words,
    },
    toc: Array.isArray(doc?.toc) ? doc.toc : buildTocFromContent(content),
    seo: doc?.seo || {},
    isPublished: doc?.status === 'published',
    createdBy: doc?.createdBy,
    agentId: doc?.agentId,
    workflowId: doc?.workflowId,
    source: 'db',
  };
};

const normalizeVeliteBlog = (blog) => ({
  ...blog,
  source: 'file',
  isPublished: blog.isPublished !== false,
  publishedAt: new Date(blog.publishedAt).toISOString(),
  updatedAt: blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
});

export const getVeliteBlogs = () => fileBlogs.map(normalizeVeliteBlog);

export const getDbBlogs = async () => {
  try {
    await connectDB();
    const docs = await Blog.find({ status: 'published' }).sort({ publishedAt: -1 }).lean();
    return docs.map(normalizeDbBlog);
  } catch (error) {
    console.error('Failed to load blogs from database:', error);
    return [];
  }
};

export const getAllBlogs = async () => {
  const [dbBlogs, veliteBlogs] = await Promise.all([getDbBlogs(), Promise.resolve(getVeliteBlogs())]);

  const merged = new Map();
  veliteBlogs.forEach((blog) => {
    if (blog?.slug) merged.set(blog.slug, blog);
  });
  dbBlogs.forEach((blog) => {
    if (blog?.slug) merged.set(blog.slug, blog);
  });

  return Array.from(merged.values())
    .filter((blog) => blog?.isPublished)
    .sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
};

export const getBlogBySlug = async (slug) => {
  const dbBlogs = await getDbBlogs();
  const dbBlog = dbBlogs.find((blog) => blog.slug === slug);
  if (dbBlog) return dbBlog;

  const veliteBlog = getVeliteBlogs().find((blog) => blog.slug === slug);
  return veliteBlog || null;
};
