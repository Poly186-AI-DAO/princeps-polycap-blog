import Link from 'next/link'
import siteMetadata from '@/src/utils/siteMetaData'

const BrandHero = () => {
  const { brandStrategy, poly } = siteMetadata

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
    <section className="relative w-full overflow-hidden rounded-[36px] border border-white/5 bg-gradient-to-br from-[#06030F] via-[#140828] to-[#220E3C] px-6 py-12 text-light shadow-[0_25px_80px_rgba(18,1,44,0.45)] sm:px-10 md:px-16 lg:px-24 mt-8 sm:mt-12 mx-3 xs:mx-6 sm:mx-10 lg:mx-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(120,63,255,0.35), transparent 45%), radial-gradient(circle at 80% 0%, rgba(255,90,193,0.25), transparent 35%)',
        }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-10">
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.4em] text-accent/90">
            Build log · Princeps Polycap
          </span>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Designing the operating system for a post-scarcity world.
          </h1>
          <p className="text-lg text-light/80 sm:text-xl lg:text-2xl">
            Founder of Poly, architect of Poly186, SESAP, Automating Basic Needs,
            and the Terraforming Sahara moonshot. This is the canonical record of
            turning sci-fi scale ideas into revenue-backed systems.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/contact"
              className="rounded-full bg-light px-6 py-3 text-base font-semibold text-dark transition hover:-translate-y-0.5 hover:bg-light/90"
            >
              Collaborate on Poly186
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-white/40 px-6 py-3 text-base font-semibold text-light transition hover:-translate-y-0.5"
            >
              Meet Princeps
            </Link>
            <a
              href={poly}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/20 px-6 py-3 text-base font-semibold text-light/80 transition hover:-translate-y-0.5 hover:text-light"
            >
              Explore Poly
            </a>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
            >
              <p className="text-xs uppercase tracking-[0.35em] text-accent/70">
                {stat.label}
              </p>
              <p className="mt-3 text-lg font-semibold text-light/90">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.35em] text-accent/80">
              Brand essence
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              {brandStrategy.brandEssence}
            </h3>
            <p className="mt-2 text-sm text-light/80">
              Voice tone: {brandStrategy.voiceTone}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {brandStrategy.primaryAudience.map((audience) => (
                <span
                  key={audience}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-light/70"
                >
                  {audience}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.35em] text-accent/80">
              What I publish here
            </p>
            <ul className="mt-4 space-y-3 text-base text-light/90">
              {brandStrategy.primaryThemes.map((theme) => (
                <li key={theme} className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-accent" />
                  <span>{theme}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BrandHero
