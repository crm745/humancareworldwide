import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Status colours match the StatusBadge tones.
export const STATUS_COLORS = {
  Submitted: '#3374F5',
  Scheduled: '#8B5CF6',
  'In Progress': '#F59E0B',
  Completed: '#10B981',
  Cancelled: '#94A3B8',
};

const axis = { fontSize: 12, fill: '#64748B' };
const grid = <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />;

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-elevated">
      {label && <p className="mb-1 font-semibold text-slate-900">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? p.payload?.fill }} />
          {p.name}: <span className="font-semibold text-slate-900">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function StatusDonut({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const rows = data.filter((d) => d.count > 0);
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={rows.length ? rows : [{ status: 'None', count: 1 }]}
              dataKey="count"
              nameKey="status"
              innerRadius={64}
              outerRadius={92}
              paddingAngle={rows.length > 1 ? 2 : 0}
              stroke="none"
            >
              {(rows.length ? rows : [{ status: 'None', count: 1 }]).map((d) => (
                <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? '#E2E8F0'} />
              ))}
            </Pie>
            {rows.length > 0 && <Tooltip content={<ChartTooltip />} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tracking-tight text-slate-900">{total}</span>
          <span className="text-xs text-slate-500">Total cases</span>
        </div>
      </div>
      <ul className="w-full flex-1 space-y-2.5">
        {data.map((d) => (
          <li key={d.status} className="flex items-center gap-3 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLORS[d.status] }} />
            <span className="flex-1 whitespace-nowrap text-slate-600">{d.status}</span>
            <span className="font-semibold tabular-nums text-slate-900">{d.count}</span>
            <span className="w-11 text-right text-xs tabular-nums text-slate-400">{total ? Math.round((d.count / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MonthlyCasesChart({ data }) {
  return (
    <div className="h-[260px]">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="casesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1A5BE0" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#1A5BE0" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#BCD6FE' }} />
          <Area type="monotone" dataKey="cases" name="Cases" stroke="#1A5BE0" strokeWidth={2.5} fill="url(#casesFill)" activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompletedPendingChart({ data }) {
  return (
    <div className="h-[260px]">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={2}>
          {grid}
          <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
          <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar dataKey="completed" name="Completed" stackId="a" fill="#10B981" maxBarSize={28} />
          <Bar dataKey="pending" name="Pending / Active" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const SERVICE_COLORS = ['#1A5BE0', '#3374F5', '#5995FA', '#8EBBFD', '#14B8A6', '#8B5CF6'];

export function ServiceWiseChart({ data }) {
  const rows = [...data].sort((a, b) => b.count - a.count);
  return (
    <div className="h-[260px]">
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="service" width={150} tick={{ ...axis, fill: '#334155' }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
          <Bar dataKey="count" name="Cases" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {rows.map((r, i) => (
              <Cell key={r.service} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
