import mongoose from 'mongoose';

const ImageSchema = new mongoose.Schema(
  {
    url: String,
    alt: String,
    width: Number,
    height: Number,
    blurDataURL: String,
  },
  { _id: false }
);

const ReadingTimeSchema = new mongoose.Schema(
  {
    text: String,
    minutes: Number,
    words: Number,
  },
  { _id: false }
);

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date },
    image: ImageSchema,
    readingTime: ReadingTimeSchema,
    toc: { type: Array, default: [] },
    seo: {
      metaTitle: String,
      metaDescription: String,
      ogImage: String,
      keywords: [String],
    },
    createdBy: String,
    agentId: String,
    workflowId: String,
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    collection: 'blogs',
  }
);

const Blog = mongoose.models.Blog || mongoose.model('Blog', BlogSchema);

export default Blog;
