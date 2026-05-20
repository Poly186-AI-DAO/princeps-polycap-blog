const siteMetadata = require("./src/utils/siteMetaData");
const mongoose = require("mongoose");

const SITEMAP_PRIORITY = 0.7;
const SITEMAP_CHANGEFREQ = "daily";

const buildBlogEntry = (slug, lastmod) => {
  if (!slug) return null;
  return {
    loc: `/blogs/${slug}`,
    lastmod: lastmod || new Date().toISOString(),
    changefreq: SITEMAP_CHANGEFREQ,
    priority: SITEMAP_PRIORITY,
  };
};

const getMongoBlogEntries = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) return [];

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { bufferCommands: false });
    }

    const docs = await mongoose.connection.db
      .collection("blogs")
      .find(
        { status: "published", slug: { $exists: true, $ne: "" } },
        { projection: { slug: 1, updatedAt: 1, publishedAt: 1 } }
      )
      .toArray();

    return docs
      .map((doc) =>
        buildBlogEntry(doc.slug, doc.updatedAt || doc.publishedAt)
      )
      .filter(Boolean);
  } catch (error) {
    console.error("next-sitemap: failed to load Mongo blogs", error);
    return [];
  }
};

const getVeliteBlogEntries = async () => {
  try {
    const generated = await import("./.velite/generated/index.js");
    const blogs = generated.blogs || [];

    return blogs
      .filter((blog) => blog?.isPublished !== false && blog?.slug)
      .map((blog) => buildBlogEntry(blog.slug, blog.updatedAt || blog.publishedAt))
      .filter(Boolean);
  } catch {
    return [];
  }
};

module.exports = {
  siteUrl: siteMetadata.siteUrl,
  generateRobotsTxt: true,
  exclude: ["/icon.ico", "/apple-icon.png", "/manifest.webmanifest"],
  additionalPaths: async () => {
    const [mongoEntries, veliteEntries] = await Promise.all([
      getMongoBlogEntries(),
      getVeliteBlogEntries(),
    ]);

    const deduped = new Map();
    [...veliteEntries, ...mongoEntries].forEach((entry) => {
      if (!entry?.loc) return;

      const existing = deduped.get(entry.loc);
      if (!existing) {
        deduped.set(entry.loc, entry);
        return;
      }

      const existingDate = new Date(existing.lastmod || 0).getTime();
      const nextDate = new Date(entry.lastmod || 0).getTime();
      if (nextDate > existingDate) {
        deduped.set(entry.loc, entry);
      }
    });

    return Array.from(deduped.values());
  },
};
