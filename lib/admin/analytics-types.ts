export type TrafficRow = { label: string; pageviews: number; visitors: number };
export type AnalyticsData = {
  updatedAt: string;
  since: string;
  until: string;
  recent: TrafficRow;
  today: TrafficRow;
  week: TrafficRow;
  daily: TrafficRow[];
  pages: TrafficRow[];
  products: TrafficRow[];
  referrers: TrafficRow[];
  productNamesUnavailable: boolean;
};
