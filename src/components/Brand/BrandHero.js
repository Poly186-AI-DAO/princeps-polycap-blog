import Link from 'next/link'
import siteMetadata from '@/src/utils/siteMetaData'

const BrandHero = () => {
  const { agencyofpoly } = siteMetadata

  return (
    <section className="relative w-full overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#06030F] via-[#140828] to-[#220E3C] text-light shadow-[0_25px_80px_rgba(18,1,44,0.45)] px-6 sm:px-10 md:px-16 lg:px-20 py-12 sm:py-16 md:py-20 mt-6 sm:mt-8 mb-8 sm:mb-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-60 animate-pulse"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(120,63,255,0.35), transparent 45%), radial-gradient(circle at 80% 0%, rgba(255,90,193,0.25), transparent 35%)',
          animationDuration: '4s',
        }}
        aria-hidden
      />

      <div className="relative flex flex-col items-start gap-6 max-w-4xl mx-auto">
        <span className="text-xs font-semibold uppercase tracking-[0.4em] text-light/70 animate-fade-in opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          🚀 Building in public
        </span>
        
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl lg:text-6xl animate-fade-in opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
          Designing the operating system for a post-scarcity world.
        </h1>
        
        <p className="text-base sm:text-lg text-light/80 leading-relaxed max-w-2xl animate-fade-in opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
          Founder of Poly, architect of Poly186, SESAP, Automating Basic Needs, and the Terraforming Sahara moonshot.
        </p>

        <div className="flex flex-wrap gap-3 sm:gap-4 pt-2 animate-fade-in opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
          <a
            href="https://poly186.io"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-light px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-dark transition-all duration-300 hover:-translate-y-1 hover:bg-light/90 hover:shadow-xl hover:scale-105"
          >
            Collaborate on Poly186
          </a>
          <Link
            href="/about"
            className="rounded-full border border-white/40 px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-light transition-all duration-300 hover:-translate-y-1 hover:border-white/60 hover:bg-white/5"
          >
            Meet Princeps
          </Link>
          <a
            href={agencyofpoly}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/20 px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-light/80 transition-all duration-300 hover:-translate-y-1 hover:text-light hover:border-white/40 hover:bg-white/5"
          >
            Explore Poly
          </a>
        </div>
      </div>
    </section>
  )
}

export default BrandHero
