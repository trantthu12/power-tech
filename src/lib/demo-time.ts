// Single fixed "now" for the whole demo. The mock dataset is generated for the
// 90 days before this instant, so the app must anchor its time windows here
// (never to the real wall clock) — otherwise KPIs drift on every reload and
// eventually fall to zero once real time passes the demo anchor.
export const DEMO_NOW_MS = new Date("2026-07-20T12:00:00Z").getTime();
