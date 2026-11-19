import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { analyticsConfigured, readAnalytics } from '@/lib/admin/analytics';
import { getPublicCatalog } from '@/lib/catalog/public-server';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };

export async function GET() {
  // Keep outside catch: Next auth redirects must never become successful responses.
  await requireAdmin();
  if (!analyticsConfigured()) return NextResponse.json({ error: 'Analytics ainda não configurado. Consulte docs/admin/analytics.md.' }, { status: 503, headers });
  try {
    const data = await readAnalytics();
    let products = data.products;
    let productNamesUnavailable = false;
    try {
      const catalog = await getPublicCatalog();
      products = products.map(row => {
        const slug = row.label.match(/^\/produto\/([^/]+)\/?$/)?.[1];
        let name: string | undefined;
        try { name = slug ? catalog.getProductBySlug(decodeURIComponent(slug))?.name : undefined; } catch { /* Keep original path. */ }
        return { ...row, label: name || row.label };
      });
    } catch { productNamesUnavailable = true; }
    return NextResponse.json({ ...data, products, productNamesUnavailable }, { headers });
  } catch {
    // Never forward upstream bodies, project identifiers, headers or credentials.
    return NextResponse.json({ error: 'Não foi possível consultar a Vercel. Verifique a configuração e tente novamente.' }, { status: 502, headers });
  }
}
