# Blog publish — schema contract

Source of truth: `src/models/Blog.js`, sha `bc33a659`, collection `blogs`.

This file exists so a publish attempt can be validated **before** it touches
Mongo. It is written from the schema, not from the publisher's payload.

## Required on every write (Mongoose `required: true`)

| field | type | note |
|---|---|---|
| `title` | String | |
| `slug` | String | **`unique: true`** and indexed |
| `description` | String | |
| `content` | String | |
| `author` | String | |

A payload missing any one of these is rejected by Mongoose **before** any
document exists. It produces no row, no error visible to the caller unless the
caller inspects the validation error, and no live URL.

## Optional, with consequences

| field | type | default | consequence if absent |
|---|---|---|---|
| `status` | String enum `draft`\|`published`\|`archived` | `draft` | write silently lands as a **draft**. A caller that assumes "write succeeded" while omitting `status` gets a document that no published-filtered read will ever return. |
| `publishedAt` | Date | **none** | a doc can be `status: 'published'` with no `publishedAt`. Sorts last, or is dropped, on any read path ordered by `publishedAt`. Repaired by `scripts/repair/backfill_published_at.mjs`. |
| `tags` | [String] | `[]` | |
| `image` | `{url, alt, width, height, blurDataURL}` | — | renders without a hero image |
| `readingTime` | `{text, minutes, words}` | — | |
| `toc` | Array | `[]` | |
| `seo` | `{metaTitle, metaDescription, ogImage, keywords}` | — | |
| `createdBy`, `agentId`, `workflowId` | String | — | **provenance lost**. Populate these or the row cannot be traced back to the execution that produced it. |

## The field that is not there

**There is no `portfolioId`, `brandId`, or `workspaceId` on `BlogSchema`.**

That is the load-bearing fact for the publish valve. The platform documents
the surface as *"each brand publishes to its own database."* With no portfolio
field on the model, that sentence can only be true in one of two ways:

1. **Database-name resolution at connect time** — the publisher picks a
   database (`PrincepsBlog`, etc.) from the portfolio id, then writes into
   `<that db>.blogs`. Correct-by-design, and the map in
   `PORTFOLIO_BLOG_DB_MAP` is the whole mechanism.
2. **Not implemented** — the publisher connects to a single platform database
   and every portfolio reads the same empty `blogs` collection.

Nothing else is possible. There is no third design where a portfolio id is a
document field, because the schema has no such field.

### Consequence for the "no brand anchor" defect

`list_recent_blogs(portfolio_id=X) -> []` and `list_recent_blogs() -> []` are
**consistent with both designs**. An empty array proves the read path returned
no documents. It does not prove the portfolio is unprovisioned, and it does not
prove documents are missing — the documents could be sitting in `PrincepsBlog`
while the read path queries somewhere else entirely.

The two are distinguished by one query, run against each candidate database:

```js
db.blogs.countDocuments({})                       // is anything here at all?
db.blogs.countDocuments({ status: 'published' })  // is anything visible?
```

- `PrincepsBlog.blogs` non-empty + platform db empty → defect is **DB-name
  resolution** in the read/publish path. Provisioning a brand portfolio item
  changes nothing.
- Both empty → nothing has ever been written. The defect is **upstream of the
  database**; no schema or migration work can help.
- Both non-empty → the defect is in the **read filter**, not the data.

Naming a brand of record is therefore not the decision that unblocks this.
The decision is: **which database does the read path connect to, and is it the
one holding the rows.** That is answerable with the queries above, in minutes,
without provisioning anything.

## Pre-flight check for any publish attempt

Before reporting a publish failure as a mapping problem, confirm the payload
would survive validation. Cheap, local, no network:

```js
const required = ['title', 'slug', 'description', 'content', 'author'];
const missing  = required.filter((k) => !payload[k] || !String(payload[k]).trim());
if (missing.length) throw new Error(`payload missing required: ${missing.join(', ')}`);
if (!payload.status) payload.status = 'published';   // do not rely on the schema default
if (payload.status === 'published' && !payload.publishedAt) payload.publishedAt = new Date();
```

A failure here is a **payload** defect. It will never be fixed by a restart, a
re-map, or a new portfolio item — and it looks identical to a mapping failure
from the outside, because both end in "no live URL."
