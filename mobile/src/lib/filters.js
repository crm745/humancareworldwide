export const DEFAULT_FILTERS = { service: 'all', date: 'all', from: '', to: '', sort: 'newest' };

// Date-range + service + sort filtering shared by My Requests and the corporate case list.
// `today` is the mock data's anchor date (see REQUESTS_TODAY / CASES_TODAY).
export function applyFilters(items, filters, today) {
  const now = new Date(today);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const out = items.filter((item) => {
    if (filters.service !== 'all' && item.service !== filters.service) return false;
    const dt = new Date(item.date);
    switch (filters.date) {
      case 'today': return item.date === today;
      case 'week': return dt >= weekStart && dt <= now;
      case 'month': return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
      case 'year': return dt.getFullYear() === now.getFullYear();
      case 'custom':
        return (!filters.from || item.date >= filters.from) && (!filters.to || item.date <= filters.to);
      default: return true;
    }
  });
  return out.sort((a, b) => (filters.sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));
}
