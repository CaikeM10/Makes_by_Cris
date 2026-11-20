'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AnalyticsData, TrafficRow } from '@/lib/admin/analytics-types';

function TrafficTable({ title, rows }: { title: string; rows: TrafficRow[] }) {
  return <section className="admin-analytics-block"><h3>{title}</h3>{rows.length ? <table><thead><tr><th scope="col">{title === 'Origem do tráfego' ? 'Referrer' : title === 'Produtos mais acessados' ? 'Produto / rota' : 'Rota'}</th><th scope="col">Visualizações</th><th scope="col">Visitantes</th></tr></thead><tbody>{rows.map((row, i) => <tr key={`${row.label}-${i}`}><th scope="row">{row.label || 'Sem referrer informado'}</th><td>{row.pageviews.toLocaleString('pt-BR')}</td><td>{row.visitors.toLocaleString('pt-BR')}</td></tr>)}</tbody></table> : <p className="admin-help">Sem dados neste período.</p>}</section>;
}

export function AnalyticsPanel({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (active.current) return;
    const controller = new AbortController(); active.current = controller;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/analytics', { cache: 'no-store', signal: controller.signal });
      if (response.redirected) throw new Error('Sua sessão expirou ou não tem acesso. Entre novamente no Admin.');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível atualizar as métricas.');
      setData(payload); setError(''); setNow(Date.now());
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Não foi possível atualizar as métricas.');
    } finally { if (active.current === controller) active.current = null; if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); clearInterval(clock); active.current?.abort(); active.current = null; };
  }, [refresh]);
  const metrics = data ? [
    ['Visitantes nos últimos 5 minutos', data.recent.visitors], ['Visitantes hoje (UTC)', data.today.visitors],
    ['Visualizações hoje (UTC)', data.today.pageviews], ['Visitantes nos últimos 7 dias', data.week.visitors], ['Visualizações nos últimos 7 dias', data.week.pageviews],
  ] as const : [];
  const displayedMetrics = compact ? [metrics[1], metrics[3], metrics[4]] : metrics;
  const max = data ? Math.max(1, ...data.daily.flatMap(row => [row.pageviews, row.visitors])) : 1;
  return <section className="admin-analytics" aria-labelledby="analytics-title" aria-busy={loading}>
    <header className="admin-analytics-header"><div><p className="admin-eyebrow">Vercel Web Analytics</p><h2 id="analytics-title">{compact ? 'Acessos do site' : 'Analytics'}</h2></div>{!compact && <button type="button" className="catalog-secondary" disabled={loading} onClick={() => void refresh()}>{loading ? 'Atualizando…' : 'Atualizar'}</button>}</header>
    {!compact && <p className="admin-help">Produção · últimos 7 dias, incluindo hoje · dias em UTC. Últimos 5 minutos são uma janela agregada, sujeita ao atraso da Vercel.</p>}
    {data && !compact && <p className="admin-help">{new Date(data.since).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a {new Date(data.until).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} · Atualizado há {Math.max(0, Math.floor((now - Date.parse(data.updatedAt)) / 1000))} segundos{error ? ' · Dados anteriores' : ''}</p>}
    {compact && data && error && <p className="admin-help">Dados anteriores</p>}
    {error && <p role="alert" className="admin-message admin-error">{error}</p>}
    {loading && !data && <div className="admin-summary-grid admin-analytics-skeleton" role="status" aria-label="Carregando métricas">{Array.from({ length: compact ? 3 : 5 }, (_, i) => <div key={i}>Carregando…</div>)}</div>}
    {data && <>
      <dl className="admin-summary-grid">{displayedMetrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value.toLocaleString('pt-BR')}</dd></div>)}</dl>
      {data.week.pageviews === 0 && <p className="admin-message" role="status">Sem acessos registrados neste período. Confirme se Web Analytics está habilitado na Vercel.</p>}
      {!compact && <><section className="admin-analytics-block"><h3>Tráfego diário · últimos 7 dias (UTC)</h3><p className="admin-help">Vinho: visualizações · rosa: visitantes. Visitantes diários não devem ser somados para obter visitantes únicos do período.</p>
        {data.daily.length ? <><svg className="admin-traffic-chart" viewBox="0 0 700 180" role="img" aria-label="Tráfego diário. Os valores estão na tabela abaixo.">{data.daily.map((row, i) => {
          const width = 700 / data.daily.length; const x = i * width;
          return <g key={row.label}><title>{`${row.label}: ${row.pageviews} visualizações, ${row.visitors} visitantes`}</title><rect x={x + width * .15} y={160 - row.pageviews / max * 140} width={width * .28} height={row.pageviews / max * 140} fill="#743b4b" /><rect x={x + width * .48} y={160 - row.visitors / max * 140} width={width * .28} height={row.visitors / max * 140} fill="#b87b87" /></g>;
        })}</svg><table><thead><tr><th scope="col">Data (UTC)</th><th scope="col">Visualizações</th><th scope="col">Visitantes</th></tr></thead><tbody>{data.daily.map(row => <tr key={row.label}><th scope="row">{new Date(row.label).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</th><td>{row.pageviews}</td><td>{row.visitors}</td></tr>)}</tbody></table></> : <p className="admin-help">Sem dados neste período.</p>}
      </section>
      <TrafficTable title="Top páginas" rows={data.pages} />
      <TrafficTable title="Produtos mais acessados" rows={data.products} />
      {data.productNamesUnavailable && <p className="admin-help">Nomes indisponíveis; exibindo as rotas originais.</p>}
      <TrafficTable title="Origem do tráfego" rows={data.referrers} />
      <p className="admin-help">Origens são os hostnames informados pela Vercel; ausência de referrer não confirma acesso direto. Others é o agrupamento restante da API. Tráfego administrativo e endpoints internos são excluídos.</p>
      </>}
    </>}
    {compact && <Link href="/admin/analytics">Ver Analytics →</Link>}
  </section>;
}
