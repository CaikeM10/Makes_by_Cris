import 'server-only';
import { unstable_cache } from 'next/cache';
import type { AnalyticsData, TrafficRow } from './analytics-types';

// Official aggregate API: no private dashboard endpoints or local pageview storage.
const endpoint = 'https://api.vercel.com/v1/query/web-analytics/visits/aggregate';
const publicFilter = "environment eq 'production' and not startswith(requestPath, '/admin') and not startswith(requestPath, '/api/') and not startswith(requestPath, '/auth/')";

export function analyticsConfigured() {
  return !!(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID);
}

export function trafficRows(payload: unknown, dimension?: string): TrafficRow[] {
  if (!payload || typeof payload !== 'object' || !('data' in payload)) throw new Error('analytics-schema');
  const data = payload.data;
  const rows = Array.isArray(data) ? data : [data];
  return rows.map(row => {
    if (!row || typeof row !== 'object' || typeof row.pageviews !== 'number' || typeof row.visitors !== 'number' || !Number.isFinite(row.pageviews) || !Number.isFinite(row.visitors) || row.pageviews < 0 || row.visitors < 0) throw new Error('analytics-schema');
    const label = dimension ? row[dimension] : '';
    if (dimension && typeof label !== 'string' && !(dimension === 'referrerHostname' && label === null)) throw new Error('analytics-schema');
    return { label: label ?? '', pageviews: row.pageviews, visitors: row.visitors };
  });
}

async function query(since: string, until: string, by?: string, extraFilter?: string) {
  const url = new URL(endpoint);
  url.searchParams.set('projectId', process.env.VERCEL_PROJECT_ID!);
  if (process.env.VERCEL_TEAM_ID) url.searchParams.set('teamId', process.env.VERCEL_TEAM_ID);
  url.searchParams.set('since', since);
  url.searchParams.set('until', until);
  // A mandatory dimension is required by the official schema. Production is a
  // single environment group, preserving exact period visitors without summing.
  url.searchParams.set('by', by || 'environment');
  url.searchParams.set('limit', '10');
  url.searchParams.set('filter', extraFilter ? `${publicFilter} and ${extraFilter}` : publicFilter);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`analytics-http-${response.status}`);
  return trafficRows(await response.json(), by === 'day' ? 'timestamp' : by);
}

export async function queryAnalytics(now = new Date()): Promise<Omit<AnalyticsData, 'productNamesUnavailable'>> {
  const until = now.toISOString();
  // API day buckets are UTC. Both cards and chart explicitly use this timezone.
  const today = new Date(now); today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today); start.setUTCDate(start.getUTCDate() - 6);
  const since = start.toISOString();
  const [recent, day, week, daily, pages, products, referrers] = await Promise.all([
    query(new Date(now.getTime() - 300000).toISOString(), until),
    query(today.toISOString(), until), query(since, until), query(since, until, 'day'),
    query(since, until, 'requestPath'),
    query(since, until, 'requestPath', "startswith(requestPath, '/produto/')"),
    query(since, until, 'referrerHostname'),
  ]);
  const total = (rows: TrafficRow[]) => {
    if (rows.length > 1) throw new Error('analytics-total-schema');
    return rows[0] ?? { label: '', pageviews: 0, visitors: 0 };
  };
  return { updatedAt: until, since, until, recent: total(recent), today: total(day), week: total(week), daily: daily.sort((a, b) => a.label.localeCompare(b.label)), pages, products, referrers };
}

// Shared server cache bounds manual refresh and concurrent Admin tabs too.
export const readAnalytics = unstable_cache(queryAnalytics, ['admin-vercel-analytics-v1'], { revalidate: 60 });
