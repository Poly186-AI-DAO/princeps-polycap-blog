import { getSitemapEntries, toSitemapXml } from '@/src/lib/sitemap';

export const revalidate = 60;

export async function GET() {
  const entries = await getSitemapEntries();
  const xml = toSitemapXml(entries);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
