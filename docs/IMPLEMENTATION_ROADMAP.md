# Princeps Polycap Personal Brand Website - Implementation Roadmap

## Overview

This document outlines the strategic transformation of the blog platform from a static, file-based system to a dynamic MongoDB-backed application that integrates with the Poly186 ecosystem and serves as the central personal brand hub for Princeps Polycap.

**Version:** 1.0  
**Last Updated:** November 5, 2025  
**Primary Purpose:** Guide the complete refactoring and rebranding of the blog platform

---

## Phase 1: Foundation & Architecture

### 1.1 Technology Stack Transition

#### Current State
- **Blog Storage:** Local MDX files in `/content/blogs/`
- **Build Process:** Velite.js (static generation at build time)
- **Data Pipeline:** File → Velite → Compiled → Static HTML
- **Database:** None (static files only)
- **Views Tracking:** Supabase (partial integration)

#### Target State
- **Blog Storage:** MongoDB collections
- **Build Process:** Next.js API routes with dynamic rendering
- **Data Pipeline:** Poly Workflow → MongoDB → Next.js API → Frontend
- **Database:** MongoDB (primary data store)
- **ORM/ODM:** Mongoose (recommended) or Prisma (MongoDB support)
- **Views Tracking:** MongoDB collection + Supabase integration
- **Content Sources:** 
  - Automated Poly workflow pushing to MongoDB
  - Manual admin interface for content management
  - Direct MongoDB integration

### 1.2 Database Schema Design

#### Collections Structure

```
mongo_database/
├── blogs (Core blog posts)
│   ├── _id: ObjectId
│   ├── title: String
│   ├── slug: String (unique, indexed)
│   ├── description: String
│   ├── content: String (MDX/HTML)
│   ├── image: {
│   │   src: String (URL)
│   │   alt: String
│   │   blurDataURL: String
│   │   width: Number
│   │   height: Number
│   │ }
│   ├── author: String
│   ├── tags: [String]
│   ├── isPublished: Boolean (default: true)
│   ├── publishedAt: Date
│   ├── updatedAt: Date
│   ├── readingTime: Number (minutes)
│   ├── tableOfContents: [Object] (TOC structure)
│   ├── viewCount: Number (default: 0)
│   ├── source: String (enum: "manual", "poly_workflow", "admin")
│   ├── externalId: String (optional, for Poly workflow reference)
│   └── createdAt: Date (system timestamp)
│
├── blog_views (View tracking - optional separate collection)
│   ├── _id: ObjectId
│   ├── blogSlug: String
│   ├── viewCount: Number
│   ├── uniqueVisitors: Number
│   ├── lastViewed: Date
│   └── viewHistory: [{ timestamp: Date, source: String }]
│
├── categories (Blog categories/tags metadata)
│   ├── _id: ObjectId
│   ├── name: String
│   ├── slug: String (unique)
│   ├── description: String
│   ├── postCount: Number
│   └── color: String (brand color)
│
├── site_metadata (Princeps Polycap brand info)
│   ├── _id: ObjectId
│   ├── siteTitle: String
│   ├── siteDescription: String
│   ├── authorName: String
│   ├── authorBio: String
│   ├── authorImage: String
│   ├── socialLinks: {
│   │   twitter: String
│   │   github: String
│   │   linkedin: String
│   │   ...
│   │ }
│   ├── contactEmail: String
│   └── siteUrl: String
│
└── brand_content (Curated content aligned with brand strategy)
    ├── _id: ObjectId
    ├── type: String (enum: "hero_section", "about", "values", etc.)
    ├── section: String (identifier)
    ├── content: String (HTML/Markdown)
    ├── metadata: Object (flexible structure)
    └── updatedAt: Date
```

### 1.3 ORM/ODM Choice: Mongoose vs Prisma

| Aspect | Mongoose | Prisma |
|--------|----------|--------|
| **Setup Complexity** | Moderate | Simple |
| **Query Syntax** | Native MongoDB syntax | Prisma DSL (slightly abstracted) |
| **Type Safety** | Manual/TypeScript interfaces | Auto-generated types |
| **MongoDB Agnostic** | Requires MongoDB | Better abstraction layer |
| **Recommendation** | Optimal for MongoDB | Also viable |

**Decision:** Use **Mongoose** for tighter MongoDB integration and more direct control over schemas and queries.

---

## Phase 2: Database & ORM Setup

### 2.1 Install Dependencies

```bash
npm install mongoose dotenv
npm install -D @types/mongoose typescript
```

### 2.2 Environment Variables (.env.local)

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://[user]:[password]@[cluster].mongodb.net/[database]?retryWrites=true&w=majority

# Database Configuration
MONGODB_DATABASE=princeps_polycap_blog

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Supabase (for view tracking integration)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 2.3 Mongoose Connection Module

**File:** `src/lib/mongodb.js`

```javascript
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default connectDB
```

### 2.4 Mongoose Schemas

**File:** `src/lib/models/Blog.js`

```javascript
import mongoose from 'mongoose'

const BlogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String, required: true },
  content: { type: String, required: true }, // MDX or HTML
  image: {
    src: String,
    alt: String,
    blurDataURL: String,
    width: Number,
    height: Number,
  },
  author: { type: String, default: 'Princeps Polycap' },
  tags: [String],
  isPublished: { type: Boolean, default: true, index: true },
  publishedAt: { type: Date, index: true },
  updatedAt: { type: Date, default: Date.now },
  readingTime: Number,
  tableOfContents: [Object],
  viewCount: { type: Number, default: 0 },
  source: {
    type: String,
    enum: ['manual', 'poly_workflow', 'admin'],
    default: 'manual',
  },
  externalId: String, // Reference to Poly workflow
  createdAt: { type: Date, default: Date.now, index: true },
})

export default mongoose.models.Blog || mongoose.model('Blog', BlogSchema)
```

**File:** `src/lib/models/SiteMetadata.js`

```javascript
import mongoose from 'mongoose'

const SiteMetadataSchema = new mongoose.Schema({
  siteTitle: String,
  siteDescription: String,
  authorName: { type: String, default: 'Princeps Polycap' },
  authorBio: String,
  authorImage: String,
  socialLinks: {
    twitter: String,
    github: String,
    linkedin: String,
    email: String,
  },
  contactEmail: String,
  siteUrl: String,
  updatedAt: { type: Date, default: Date.now },
})

export default mongoose.models.SiteMetadata ||
  mongoose.model('SiteMetadata', SiteMetadataSchema)
```

---

## Phase 3: API Routes

### 3.1 Blog API Endpoints

**File:** `src/app/api/blogs/route.js`

```javascript
import { NextResponse } from 'next/server'
import connectDB from '@/src/lib/mongodb'
import Blog from '@/src/lib/models/Blog'

// GET all published blogs
export async function GET(request) {
  try {
    await connectDB()
    const blogs = await Blog.find({ isPublished: true })
      .sort({ publishedAt: -1 })
      .exec()
    
    return NextResponse.json(blogs, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST new blog (from Poly workflow or admin)
export async function POST(request) {
  try {
    await connectDB()
    const data = await request.json()
    
    const blog = new Blog(data)
    await blog.save()
    
    return NextResponse.json(blog, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

**File:** `src/app/api/blogs/[slug]/route.js`

```javascript
import { NextResponse } from 'next/server'
import connectDB from '@/src/lib/mongodb'
import Blog from '@/src/lib/models/Blog'

// GET single blog by slug
export async function GET(request, { params }) {
  try {
    await connectDB()
    const { slug } = await params
    
    const blog = await Blog.findOne({ slug, isPublished: true })
    
    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 })
    }
    
    // Increment view count
    blog.viewCount = (blog.viewCount || 0) + 1
    await blog.save()
    
    return NextResponse.json(blog, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT update blog
export async function PUT(request, { params }) {
  try {
    await connectDB()
    const { slug } = await params
    const data = await request.json()
    
    const blog = await Blog.findOneAndUpdate(
      { slug },
      { ...data, updatedAt: new Date() },
      { new: true }
    )
    
    return NextResponse.json(blog, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

// DELETE blog
export async function DELETE(request, { params }) {
  try {
    await connectDB()
    const { slug } = await params
    
    await Blog.findOneAndDelete({ slug })
    
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### 3.2 Poly Workflow Integration Endpoint

**File:** `src/app/api/poly-workflow/blogs/route.js`

Purpose: Receives blog posts from Poly automated workflow

```javascript
import { NextResponse } from 'next/server'
import connectDB from '@/src/lib/mongodb'
import Blog from '@/src/lib/models/Blog'

// POST from Poly workflow
export async function POST(request) {
  try {
    // Verify Poly API key (add to environment)
    const apiKey = request.headers.get('x-poly-api-key')
    if (apiKey !== process.env.POLY_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    const data = await request.json()
    
    // Ensure source is marked as Poly workflow
    data.source = 'poly_workflow'
    data.author = data.author || 'Princeps Polycap'
    
    const blog = new Blog(data)
    await blog.save()
    
    return NextResponse.json(
      { success: true, blogId: blog._id },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}
```

---

## Phase 4: Frontend Refactoring

### 4.1 Update Blog Page to Use MongoDB

**File:** `src/app/blogs/[slug]/page.js` (Updated)

```javascript
import BlogDetails from "@/src/components/Blog/BlogDetails"
import RenderMdx from "@/src/components/Blog/RenderMdx"
import Tag from "@/src/components/Elements/Tag"
import siteMetadata from "@/src/utils/siteMetaData"
import { slug as slugify } from "github-slugger"
import Image from "next/image"
import { notFound } from "next/navigation"
import connectDB from "@/src/lib/mongodb"
import Blog from "@/src/lib/models/Blog"

export async function generateStaticParams() {
  // Keep static generation for performance
  // Falls back to dynamic rendering for new blogs
  try {
    await connectDB()
    const blogs = await Blog.find({ isPublished: true }, { slug: 1 })
    return blogs.map((blog) => ({ slug: blog.slug }))
  } catch (error) {
    return []
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  
  try {
    await connectDB()
    const blog = await Blog.findOne({ slug })
    
    if (!blog) return {}

    const publishedAt = new Date(blog.publishedAt).toISOString()
    const modifiedAt = new Date(blog.updatedAt || blog.publishedAt).toISOString()

    let imageList = [siteMetadata.socialBanner]
    if (blog.image?.src) {
      imageList = [blog.image.src]
    }

    const ogImages = imageList.map((img) => {
      return { url: img.includes("http") ? img : siteMetadata.siteUrl + img }
    })

    return {
      title: blog.title,
      description: blog.description,
      openGraph: {
        title: blog.title,
        description: blog.description,
        url: siteMetadata.siteUrl + `/blogs/${blog.slug}`,
        siteName: siteMetadata.title,
        locale: "en_US",
        type: "article",
        publishedTime: publishedAt,
        modifiedTime: modifiedAt,
        images: ogImages,
        authors: [blog.author || siteMetadata.author],
      },
      twitter: {
        card: "summary_large_image",
        title: blog.title,
        description: blog.description,
        images: ogImages,
      },
    }
  } catch (error) {
    return {}
  }
}

export default async function BlogPage({ params }) {
  const { slug } = await params
  
  try {
    await connectDB()
    const blog = await Blog.findOne({ slug, isPublished: true })

    if (!blog) {
      notFound()
    }

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: blog.title,
              description: blog.description,
              datePublished: new Date(blog.publishedAt).toISOString(),
              dateModified: new Date(blog.updatedAt).toISOString(),
              author: {
                "@type": "Person",
                name: blog.author,
              },
            }),
          }}
        />
        <article>
          <div className="mb-8 text-center relative w-full h-[70vh] bg-dark">
            <div className="w-full z-10 flex flex-col items-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Tag
                name={blog.tags?.[0] || "Uncategorized"}
                link={`/categories/${slugify(blog.tags?.[0] || "uncategorized")}`}
                className="px-6 text-sm py-2"
              />
              <h1 className="inline-block mt-6 font-semibold capitalize text-light text-2xl md:text-3xl lg:text-5xl !leading-normal relative w-5/6">
                {blog.title}
              </h1>
            </div>
            <div className="absolute top-0 left-0 right-0 bottom-0 h-full bg-dark/60 dark:bg-dark/40" />
            {blog.image?.src && (
              <Image
                src={blog.image.src}
                placeholder={blog.image.blurDataURL ? "blur" : "empty"}
                blurDataURL={blog.image.blurDataURL}
                alt={blog.image.alt || blog.title}
                fill
                className="object-cover"
                priority
              />
            )}
          </div>
          <BlogDetails blog={blog} slug={slug} />
          <div className="grid grid-cols-12 gap-y-8 lg:gap-8 sxl:gap-16 mt-8 px-5 md:px-10">
            <RenderMdx blog={blog} />
          </div>
        </article>
      </>
    )
  } catch (error) {
    notFound()
  }
}
```

### 4.2 Update Home Page

**File:** `src/app/page.js` (Updated)

```javascript
import connectDB from "@/src/lib/mongodb"
import Blog from "@/src/lib/models/Blog"
import HomeCoverSection from "../components/Home/HomeCoverSection"
import FeaturedPosts from "../components/Home/FeaturedPosts"
import RecentPosts from "../components/Home/RecentPosts"

export default async function Home() {
  try {
    await connectDB()
    
    // Fetch published blogs, sorted by publication date
    const blogs = await Blog.find({ isPublished: true })
      .sort({ publishedAt: -1 })
      .exec()
    
    return (
      <main className="flex flex-col items-center justify-center">
        <HomeCoverSection blogs={blogs} />
        <FeaturedPosts blogs={blogs} />
        <RecentPosts blogs={blogs} />
      </main>
    )
  } catch (error) {
    console.error('Error fetching blogs:', error)
    return (
      <main className="flex flex-col items-center justify-center">
        <p>Error loading blog posts. Please try again later.</p>
      </main>
    )
  }
}
```

---

## Phase 5: Rebranding & Brand Strategy Integration

### 5.1 Update Site Metadata

**File:** `src/utils/siteMetaData.js` (Updated for Princeps Polycap)

```javascript
const siteMetadata = {
  title: "Princeps Polycap - Building the Future",
  author: "Princeps Polycap",
  headerTitle: "Princeps Polycap",
  description:
    "Personal blog and portfolio of Princeps Polycap, exploring the intersection of technology, philosophy, and building systems for global abundance.",
  language: "en-us",
  theme: "system",
  siteUrl: "https://princepspolycap.com", // Update with actual domain
  siteLogo: "/logo.png",
  socialBanner: "/social-banner.png",
  email: "contact@princepspolycap.com", // Update
  github: "https://github.com/princepspolycap", // Update
  twitter: "https://twitter.com/PrincepsPolycap", // Update
  linkedin: "https://linkedin.com/in/princepspolycap", // Update
  locale: "en-US",
  
  // Brand-specific metadata aligned with COMPREHENSIVE BRAND STRATEGY
  brandStrategy: {
    brandEssence: "The Human Behind The Moonshots",
    primaryThemes: [
      "Origin Story & Self-Taught Journey",
      "Factory Floor to Founder",
      "Building in Public",
      "Ecosystem Hub",
    ],
    voiceTone: "Self-aware, Vulnerable, Meta-textual, Brutally Honest",
    primaryAudience: [
      "Aspiring Founders",
      "Tech Community",
      "Sci-Fi Enthusiasts",
      "Sustainability Advocates",
    ],
  },
}

module.exports = siteMetadata
```

### 5.2 Create Brand Components

**File:** `src/components/Brand/BrandHero.js` (New)

Purpose: Feature Princeps Polycap's personal story and ecosystem connections

```javascript
import React from "react"

const BrandHero = () => {
  return (
    <section className="w-full py-20 px-5 md:px-10 bg-gradient-to-r from-purple-600 to-purple-900 text-light">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Princeps Polycap
        </h1>
        <p className="text-xl md:text-2xl mb-4 font-light">
          Building the foundational systems for a post-scarcity world
        </p>
        <p className="text-lg opacity-90">
          Self-taught programmer from Kenya. Founder of Poly. Visionary behind
          Poly186, SESAP, and Terraforming Sahara. Documenting the journey of
          turning impossible dreams into tangible reality.
        </p>
      </div>
    </section>
  )
}

export default BrandHero
```

### 5.3 Create About Page for Princeps

**File:** `src/app/(about)/about/page.js` (Updated)

```javascript
import React from "react"
import Image from "next/image"

export const metadata = {
  title: "About Princeps Polycap",
  description:
    "Learn about Princeps Polycap's journey from Kenya to building world-changing technology",
}

export default function About() {
  return (
    <article className="w-full flex flex-col items-center justify-center py-20 px-5 md:px-10">
      <div className="max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">About Me</h1>

        <div className="prose dark:prose-invert max-w-none">
          <h2>The Origin Story</h2>
          <p>
            I am Princeps Polycap, a self-taught programmer and visionary
            builder from Kenya. My journey began with a simple observation: the
            world has the technological capacity to solve scarcity, yet we
            continue to accept poverty, inequality, and resource conflict as
            inevitable facts of life.
          </p>

          <h2>From Factory Floor to Founder</h2>
          <p>
            Working on the factory floors of Medtronic in Minnesota, I witnessed
            firsthand the vast amount of human potential wasted on repetitive,
            systematizable tasks. This direct experience sparked Poly—a business
            OS powered by AI digital workers, designed to liberate human
            potential from drudgery.
          </p>

          <h2>The Poly186 Vision</h2>
          <p>
            But Poly is just the beginning. The larger mission—Poly186—is
            audacious: to build the foundational systems for a post-scarcity
            world by automating the production and distribution of basic human
            necessities (food, water, energy, shelter).
          </p>

          <h2>The Ecosystem</h2>
          <p>
            This mission is too vast for any single company. It requires an
            integrated ecosystem:
          </p>
          <ul>
            <li>
              <strong>Poly</strong>: The practical "how" applied to today's
              businesses, funding the vision through revenue
            </li>
            <li>
              <strong>SESAP</strong>: The foundational "how" for tomorrow—a new
              operating system for society based on Smart Social Contracts
            </li>
            <li>
              <strong>Automating Basic Needs</strong>: The core mission,
              tangibly applied
            </li>
            <li>
              <strong>BLAH</strong>: Visualizing the beautiful future we're
              building
            </li>
            <li>
              <strong>Terraforming Sahara</strong>: The ultimate moonshot—solving
              climate change and creating habitable zones
            </li>
          </ul>

          <h2>Building in Public</h2>
          <p>
            This website is my journey. Raw, unfiltered, real. You'll see the
            struggles, the breakthroughs, the meta-irony of using AI to document
            building AI for human liberation. This is what building in public
            looks like.
          </p>
        </div>
      </div>
    </article>
  )
}
```

---

## Phase 6: Poly Workflow Integration

### 6.1 Configure Poly to Push Blogs

**In Your Poly Workflow:**

Create a workflow that:

1. **Generates Blog Content** - Using your AI digital workers to generate thematically aligned content
2. **Structures Data** - Formats the blog data according to the MongoDB schema
3. **Authenticates** - Includes Poly API key in headers
4. **Posts to Endpoint** - Sends POST request to `/api/poly-workflow/blogs`

**Example Payload Structure:**

```json
{
  "title": "The Future of AI in Agriculture",
  "slug": "future-ai-agriculture",
  "description": "How AI-powered systems can revolutionize food production globally",
  "content": "# The Future of AI in Agriculture\n\n...",
  "author": "Princeps Polycap",
  "tags": ["AI", "Agriculture", "Poly186"],
  "image": {
    "src": "https://example.com/image.jpg",
    "alt": "AI farming",
    "width": 1200,
    "height": 800
  },
  "publishedAt": "2025-11-05T10:00:00Z",
  "isPublished": true,
  "readingTime": 5
}
```

### 6.2 Webhook Configuration (Optional)

For real-time updates, configure a webhook to rebuild critical pages when blogs are published:

```env
POLY_WEBHOOK_SECRET=your_webhook_secret_here
```

---

## Phase 7: Migration Plan (From Static to Dynamic)

### 7.1 Data Migration Strategy

1. **Export Existing MDX Files**
   - Script to read all `/content/blogs/` MDX files
   - Parse frontmatter and content
   - Transform to MongoDB documents

2. **Migration Script** (Create new file)

**File:** `scripts/migrate-mdx-to-mongo.js`

```javascript
import fs from "fs"
import path from "path"
import matter from "gray-matter"
import connectDB from "@/src/lib/mongodb"
import Blog from "@/src/lib/models/Blog"

async function migrateMDXToMongo() {
  await connectDB()

  const blogsDir = path.join(process.cwd(), "content", "blogs")
  const dirs = fs.readdirSync(blogsDir)

  for (const dir of dirs) {
    const filePath = path.join(blogsDir, dir, "index.mdx")
    if (!fs.existsSync(filePath)) continue

    const fileContent = fs.readFileSync(filePath, "utf-8")
    const { data, content } = matter(fileContent)

    const blog = new Blog({
      title: data.title,
      slug: data.slug,
      description: data.description,
      content: content,
      image: data.image ? { src: data.image } : null,
      author: data.author || "Princeps Polycap",
      tags: data.tags || [],
      isPublished: data.isPublished !== false,
      publishedAt: new Date(data.publishedAt),
      updatedAt: new Date(data.updatedAt),
      source: "migrated",
    })

    try {
      await blog.save()
      console.log(`✓ Migrated: ${data.slug}`)
    } catch (error) {
      console.error(`✗ Error migrating ${data.slug}:`, error.message)
    }
  }

  console.log("Migration complete!")
}

migrateMDXToMongo()
```

3. **Verify Migration** - Check MongoDB for all blogs
4. **Disable Velite** - Remove Velite from build process once verified
5. **Deploy** - Push changes to production

### 7.2 Rollback Plan

Keep MDX files in `/content/blogs/` as backup until fully confident with MongoDB setup. Maintain conditional logic:

```javascript
// Fallback to MDX if MongoDB fails
let blogs
try {
  blogs = await Blog.find({ isPublished: true })
} catch (error) {
  blogs = require("./.velite/generated").blogs
}
```

---

## Phase 8: Performance Optimization

### 8.1 Caching Strategy

```javascript
// Implement ISR (Incremental Static Regeneration)
export const revalidate = 3600 // Revalidate every hour
```

### 8.2 Database Indexing

```javascript
// Already defined in schema, ensure created:
// - slug (unique, indexed)
// - publishedAt (indexed for sorting)
// - isPublished (indexed for filtering)
// - tags (indexed for category queries)
// - createdAt (indexed for timestamp queries)
```

### 8.3 Query Optimization

```javascript
// Use projection to fetch only needed fields
const blogs = await Blog.find(
  { isPublished: true },
  { title: 1, slug: 1, description: 1, tags: 1, publishedAt: 1 }
)
```

---

## Phase 9: Testing & Quality Assurance

### 9.1 Test Cases

- [ ] API endpoints return correct data
- [ ] MongoDB connection persists across requests
- [ ] Blog creation from Poly workflow succeeds
- [ ] Blog pages render correctly
- [ ] View count increments on each page visit
- [ ] Static generation works for initial load
- [ ] Dynamic rendering handles new blogs
- [ ] Error handling works gracefully
- [ ] SEO metadata generates correctly
- [ ] Image optimization works

### 9.2 Load Testing

- Test API with 100+ concurrent blog requests
- Verify MongoDB connection pooling
- Check response times

---

## Phase 10: Deployment & Monitoring

### 10.1 Environment Setup

- Configure MongoDB Atlas cluster (production)
- Set up database backups
- Enable MongoDB monitoring/alerting

### 10.2 Deployment Steps

1. Create feature branch
2. Implement Phase 2-5 changes
3. Run migration script in staging
4. Test thoroughly
5. Deploy to production
6. Monitor logs and performance

### 10.3 Monitoring

- Log all API errors
- Track MongoDB connection issues
- Monitor response times
- Alert on failed Poly workflow submissions

---

## Implementation Timeline

| Phase | Duration | Owner |
|-------|----------|-------|
| 1-3: Setup & API | 2-3 days | Dev |
| 4-5: Frontend & Branding | 3-4 days | Dev |
| 6: Poly Integration | 1-2 days | Dev + Poly Team |
| 7: Migration | 1 day | Dev |
| 8: Optimization | 1 day | Dev |
| 9: Testing | 2 days | QA |
| 10: Deployment | 1 day | Dev |
| **Total** | **~2 weeks** | - |

---

## Success Metrics

- ✅ All blog posts successfully migrated to MongoDB
- ✅ Poly workflow can create/push blogs to site automatically
- ✅ Website fully rebranded as Princeps Polycap personal brand
- ✅ API response times < 200ms
- ✅ 99.9% uptime
- ✅ 0 data loss during migration
- ✅ SEO maintained or improved

---

## Related Documentation

- **Brand Strategy:** `docs/COMPREHENSIVE_BRAND_STRATEGY.md`
- **Project Setup:** Original `README.md`

---

## Notes & Considerations

1. **Velite.js Deprecation** - Once fully migrated to MongoDB, Velite.js can be removed from dependencies
2. **Edge Cases** - Handle blog deletion (soft delete recommended to maintain URL integrity)
3. **Versioning** - Consider tracking blog version history in MongoDB
4. **Comments** - Future feature: Add comments collection for engagement
5. **Analytics** - Enhance view tracking with geographic/device data
6. **CDN** - Store images in AWS S3 or similar for optimal delivery
