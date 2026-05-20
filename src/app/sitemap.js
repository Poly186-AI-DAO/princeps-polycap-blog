import { getSitemapEntries } from '@/src/lib/sitemap';

export const revalidate = 60;

export default async function sitemap() {
  return getSitemapEntries();
}
