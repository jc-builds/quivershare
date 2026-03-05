import type { RequestHandler } from './$types';

const PROD_HOST = 'www.quivershare.com';
const PROD_BASE_URL = 'https://www.quivershare.com';
const PAGE_SIZE = 1000;

type SitemapRow = {
  id: string;
  is_deleted: boolean | null;
  state: string | null;
  last_modified: string | null;
};

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildUrlEntry(loc: string, lastmod?: string | null): string {
  if (!lastmod) return `<url><loc>${escapeXml(loc)}</loc></url>`;
  return `<url><loc>${escapeXml(loc)}</loc><lastmod>${escapeXml(lastmod)}</lastmod></url>`;
}

function buildSitemapXml(entries: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;
}

function buildBaseEntriesOnly(): string[] {
  return [
    buildUrlEntry(`${PROD_BASE_URL}/`),
    buildUrlEntry(`${PROD_BASE_URL}/s`)
  ];
}

export const GET: RequestHandler = async ({ locals, request }) => {
  const host = request.headers.get('host')?.toLowerCase() ?? '';

  // Guardrail: never emit non-production host URLs or staging content.
  // Safer behavior is to return only baseline public URLs.
  if (host.includes('staging') || host !== PROD_HOST) {
    return new Response(buildSitemapXml(buildBaseEntriesOnly()), {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    });
  }

  const entries: string[] = buildBaseEntriesOnly();
  let from = 0;

  while (true) {
    // /surfboards/[id] is the canonical listing detail route in this codebase.
    // Pull only columns needed for URL + public visibility + lastmod.
    const { data, error } = await locals.supabase
      .from('surfboards')
      .select('id,is_deleted,state,last_modified')
      .eq('is_deleted', false)
      .or('state.is.null,state.eq.active')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error || !data) {
      // Fail safe: return the static entries if listings query fails.
      break;
    }

    const rows = data as SitemapRow[];
    if (rows.length === 0) break;

    for (const row of rows) {
      entries.push(buildUrlEntry(`${PROD_BASE_URL}/surfboards/${row.id}`, row.last_modified));
    }

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return new Response(buildSitemapXml(entries), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
};
