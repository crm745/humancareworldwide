// Single source of truth for the dashboard's date-range filter — shared by DashboardPage
// (the range picker), CasesPage (deep-linked from a dashboard stat tile) and
// corporateService's mock-mode dashboard (so mock and real-API behaviour match).
export const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
];

export function rangeStart(range) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  switch (range) {
    case 'today':
      return d;
    case 'week': {
      const day = (d.getDay() + 6) % 7; // Monday-based week
      d.setDate(d.getDate() - day);
      return d;
    }
    case 'month':
      d.setDate(1);
      return d;
    case 'year':
      return new Date(d.getFullYear(), 0, 1);
    case 'all':
      return new Date(0);
    default:
      d.setDate(1);
      return d; // unrecognized range falls back to "month"
  }
}
