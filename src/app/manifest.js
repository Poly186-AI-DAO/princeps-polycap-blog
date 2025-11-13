import siteMetadata from '../utils/siteMetaData'

export default function manifest() {
  return {
    name: siteMetadata.title,
    short_name: 'Princeps Polycap',
    description: siteMetadata.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#050505',
  }
}
