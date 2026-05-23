import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatRupiah } from '../../utils/formatters';

const CHART_VIEWS = {
  orders: {
    key: 'order_count',
    label: 'Jumlah Pesanan',
    color: '#2f4274',
    format: (value) => `${value} pesanan`,
  },
  revenue: {
    key: 'total_revenue',
    label: 'Total Pendapatan',
    color: '#0ea5e9',
    format: (value) => formatRupiah(value),
  },
};

const truncateLabel = (label, max = 22) => {
  const text = String(label || '');
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const ChartTooltip = ({ active, payload, view }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-2 max-w-[220px]">{item.package_name}</p>
      <p className="text-gray-600">
        <span className="font-medium text-gray-700">Pesanan:</span> {item.order_count}
      </p>
      <p className="text-gray-600">
        <span className="font-medium text-gray-700">Pendapatan:</span> {formatRupiah(item.total_revenue)}
      </p>
      <p className="text-xs text-primary-600 mt-2 pt-2 border-t border-gray-100">
        {CHART_VIEWS[view].label}: {CHART_VIEWS[view].format(item[CHART_VIEWS[view].key])}
      </p>
    </div>
  );
};

const PackageSalesChart = ({ data = [] }) => {
  const [view, setView] = useState('orders');

  const chartData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        package_name: item.package_name || 'Tanpa nama paket',
        order_count: Number(item.order_count) || 0,
        total_revenue: Number(item.total_revenue) || 0,
        short_name: truncateLabel(item.package_name),
      })),
    [data],
  );

  const activeView = CHART_VIEWS[view];
  const chartHeight = Math.max(280, chartData.length * 52 + 40);

  const yAxisWidth = useMemo(() => {
    const longest = chartData.reduce(
      (max, d) => Math.max(max, String(d.short_name || '').length),
      4,
    );
    return Math.min(160, Math.max(44, longest * 7 + 12));
  }, [chartData]);

  const formatXAxis = (value) => {
    if (view === 'revenue') {
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
    }
    return value;
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(CHART_VIEWS).map(([key, config]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === key
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {config.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={chartHeight} className="-ml-1">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
          barCategoryGap="20%"
        >
          <defs>
            <linearGradient id="packageSalesGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2f4274" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
          <XAxis
            type="number"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
            tickFormatter={formatXAxis}
          />
          <YAxis
            type="category"
            dataKey="short_name"
            width={yAxisWidth}
            tick={{ fill: '#374151', fontSize: 12 }}
            tickMargin={4}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(47, 66, 116, 0.06)' }}
            content={(props) => <ChartTooltip {...props} view={view} />}
          />
          <Bar
            dataKey={activeView.key}
            fill={view === 'orders' ? 'url(#packageSalesGradient)' : activeView.color}
            radius={[0, 6, 6, 0]}
            maxBarSize={28}
            animationDuration={600}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PackageSalesChart;
