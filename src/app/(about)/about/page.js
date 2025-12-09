import AboutCoverSection from "@/src/components/About/AboutCoverSection"
import Skills from "@/src/components/About/Skills"
import Link from "next/link"
import siteMetadata from "@/src/utils/siteMetaData"

export const metadata = {
  title: "About Princeps Polycap",
  description:
    "Origin story, mission, and ecosystem map for Princeps Polycap, the systems architect building Poly186.",
}

export default function About() {
  const { brandStrategy } = siteMetadata

  const stats = [
    {
      label: 'Systems in flight',
      value: 'Poly · SESAP · Automating Basic Needs',
    },
    {
      label: 'Current frontier',
      value: 'Terraforming Sahara research & field labs',
    },
    {
      label: 'Operating principle',
      value: 'Build revenue engines that fund planetary regeneration',
    },
  ]

  return (
    <>
      <AboutCoverSection />
      <Skills />

      {/* Stats Grid - Moved from BrandHero */}
      <section className="w-full px-5 sm:px-10 md:px-24 lg:px-32 mt-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass-card-purple hover-lift p-6 backdrop-blur-sm"
            >
              <p className="text-xs uppercase tracking-[0.35em] text-accent dark:text-accent/70 mb-3">
                {stat.label}
              </p>
              <p className="text-base font-semibold text-dark dark:text-light/90 leading-relaxed">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Brand Info Grid - Moved from BrandHero */}
      <section className="w-full px-5 sm:px-10 md:px-24 lg:px-32 mt-12">
        <div className="grid gap-6 lg:grid-cols-2 max-w-7xl mx-auto">
          <div className="glass-card-purple hover-lift p-8 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.35em] text-accent dark:text-accent/80 mb-4">
              Brand essence
            </p>
            <h3 className="text-xl sm:text-2xl font-semibold leading-snug text-dark dark:text-light">
              {brandStrategy.brandEssence}
            </h3>
            <p className="mt-3 text-sm text-dark/70 dark:text-light/70">
              Voice tone: {brandStrategy.voiceTone}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {brandStrategy.primaryAudience.map((audience) => (
                <span
                  key={audience}
                  className="rounded-full border border-dark/20 dark:border-white/20 px-3 py-1.5 text-xs uppercase tracking-wide text-dark/70 dark:text-light/70 animate-breathe"
                >
                  {audience}
                </span>
              ))}
            </div>
          </div>

          <div className="glass-card-purple hover-lift p-8 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.35em] text-accent dark:text-accent/80 mb-5">
              What I publish here
            </p>
            <ul className="space-y-4 text-base text-dark dark:text-light/90">
              {brandStrategy.primaryThemes.map((theme) => (
                <li key={theme} className="flex items-start gap-3">
                  <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-accent flex-shrink-0 animate-pulse-glow" />
                  <span className="leading-relaxed">{theme}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <article className="prose dark:prose-invert max-w-4xl w-full mt-12 mx-5 xs:mx-10 sm:mx-12 md:mx-16 lg:mx-20">
        <h2>The origin story</h2>
        <p>
          I&apos;m Princeps Polycap, a self-taught programmer who grew up in
          Kenya before moving to the U.S. Every part of my journey has reinforced a
          single truth: scarcity is a coordination problem, not a technology
          problem. We already possess the tools to automate food, water, energy,
          and shelter, but we lack the systems and incentives to deploy them at
          scale.
        </p>

        <h2>From factory floor to founder</h2>
        <p>
          Working overnight shifts on the Medtronic factory floor in Minnesota,
          I watched brilliant people spend entire careers on repetitive tasks
          that could be automated. That experience sparked Poly, a business OS
          powered by AI digital workers so organizations can redeploy humans to
          creative, strategic work.
        </p>

        <h2>The Poly186 vision</h2>
        <p>
          Poly is the revenue engine, but the ambition is larger. Poly186 is the
          umbrella mission to automate the production and distribution of basic
          needs and reinvest the surplus into planetary-scale regeneration
          efforts like Terraforming Sahara.
        </p>

        <h2>The ecosystem</h2>
        <ul>
          <li>
            <strong>Poly</strong> – The practical operating system businesses
            buy today.
          </li>
          <li>
            <strong>SESAP</strong> – A coordination kernel built on Smart Social
            Contracts.
          </li>
          <li>
            <strong>Automating Basic Needs</strong> – Applied R&D for food,
            water, energy, and shelter.
          </li>
          <li>
            <strong>BLAH</strong> – Afrofuturist visual storytelling for the
            abundant cities we plan to inhabit.
          </li>
          <li>
            <strong>Terraforming Sahara</strong> – The moonshot: regenerate a
            continent, stabilize climate, and prove what&apos;s possible.
          </li>
        </ul>

        <h2>Building in public</h2>
        <p>
          This site is the canonical log of how everything unfolds: the wins, the
          prototypes that fail, the meta-commentary on using AI to build AI. If
          you&apos;re building something audacious, I hope this candid record
          gives you both tactical insight and moral permission to keep going.
        </p>
      </article>
      <h2 className="mt-12 font-semibold text-lg md:text-2xl self-start mx-5 xs:mx-10 sm:mx-12 md:mx-16 lg:mx-20 text-dark dark:text-light dark:font-normal">
        Want to collaborate on Poly, SESAP, or the Automating Basic Needs
        initiative? Reach out on the <Link href="/contact" className="!underline underline-offset-2">contact page</Link> and let&apos;s build it together.
      </h2>
    </>
  )
}
