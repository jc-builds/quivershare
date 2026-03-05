import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
  const hostHeader = request.headers.get('host') ?? '';
  const hostname = hostHeader.split(':')[0].toLowerCase();

  const body =
    hostname === 'staging.quivershare.com'
      ? `User-agent: *
Disallow: /`
      : `User-agent: *
Disallow:

Sitemap: https://www.quivershare.com/sitemap.xml`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
};
