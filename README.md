# Princeps Polycap — Systems for Global Abundance

This repo powers the public journal, blog, and interactive brand hub for Princeps Polycap—AI systems architect, founder of Poly, and the mind behind the Poly186 ecosystem. It reclaims the original starter template and grounds it in Princeps’ personal narrative, brand strategy, and ecosystem roadmap documented in `docs/`.

## What’s Inside
- **Next.js 15 App Router** with Tailwind CSS, React Server Components, and dark-mode support.
- **Velite-powered MDX content layer** (`content/blogs`) for editorial control while we transition to MongoDB-backed publishing.
- **Docs hub** (`docs/`) containing the COMPREHENSIVE BRAND STRATEGY and IMPLEMENTATION ROADMAP that guide every copy, design, and systems decision.
- **API + utils** scaffolding (`src/app/api`, `src/lib`) prepping the migration toward Poly-integrated content workflows.

## Local Development
1. Install dependencies: `npm install`
2. Run the content pipeline (populates `.velite/generated`): `npm run content`
3. Start the dev server: `npm run dev`
4. Visit `http://localhost:3000`

Environment variables live in `.env`. The current configuration targets the MongoDB Atlas cluster that mirrors production content.

## Content & Branding
- Update MDX posts in `content/blogs/**/index.mdx`. Frontmatter fields map directly to the `Velite` schema and (soon) the MongoDB model described in `docs/IMPLEMENTATION_ROADMAP.md`.
- Site-wide copy, SEO metadata, and platform links live in `src/utils/siteMetaData.js`. The `brandStrategy` block mirrors the “Princeps Polycap” directives from the COMPREHENSIVE BRAND STRATEGY.
- Shared narrative components (hero, about modules, footer voice) are intentionally opinionated and reference Princeps’ story, Poly, SESAP, Automating Basic Needs, and the Terraforming Sahara moonshot.

## Roadmap (from docs)
1. Finish the MongoDB content model + admin routes.
2. Connect Poly workflows so digital workers can publish and update posts.
3. Expand the brand hub: ecosystem map, case studies, live build-in-public logs.
4. Add ISR + caching strategy for traffic surges from launches and press.

## Credits
This project started from CodeBucks’ public Next.js blog template. Huge thanks for the foundational layout and component patterns. Everything else here has been reworked to express Princeps Polycap’s mission to build systems that automate basic needs and fund large-scale planetary regeneration.
