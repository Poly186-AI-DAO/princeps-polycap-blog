/** @type {import('next').NextConfig} */
module.exports = {
    // Some MDX-heavy blog posts plus a cold MongoDB Atlas connection can push
    // a single SSG page past the default 60s. Give the build more headroom.
    staticPageGenerationTimeout: 300,
    compiler: {
      removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
    },
    images: {
      remotePatterns: [
        { protocol: 'https', hostname: 'www.princepspolycap.com' },
        { protocol: 'https', hostname: 'princepspolycap.com' },
        { protocol: 'https', hostname: 'images.unsplash.com' },
        { protocol: 'https', hostname: 'res.cloudinary.com' },
      ],
    },
    async redirects() {
      return [
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: 'princepspolycap.com',
            },
          ],
          destination: 'https://www.princepspolycap.com/:path*',
          permanent: true,
        },
      ]
    },
    webpack: config => {
      config.plugins.push(new VeliteWebpackPlugin())
      return config
    }
  }
  
  class VeliteWebpackPlugin {
    static started = false
    apply(/** @type {import('webpack').Compiler} */ compiler) {
      // executed three times in nextjs
      // twice for the server (nodejs / edge runtime) and once for the client
      compiler.hooks.beforeCompile.tapPromise('VeliteWebpackPlugin', async () => {
        if (VeliteWebpackPlugin.started) return
        VeliteWebpackPlugin.started = true
        const dev = compiler.options.mode === 'development'
        const { build } = await import('velite')
        await build({ watch: dev, clean: !dev })
      })
    }
  }
