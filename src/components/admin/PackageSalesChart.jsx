import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const truncateLabel = (label, max = 22) => {
  const text = String(label || '');
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1.5 max-w-[220px]">{item.package_name}</p>
      <p className="text-gray-600 text-xs mb-1">
        <span className="font-medium text-gray-700">Peminat:</span> {item.popularity_percentage}%
      </p>
      <p className="text-gray-500 text-[11px]">
        <span className="font-medium">Total Pesanan:</span> {item.order_count}
      </p>
    </div>
  );
};

const PackageSalesChart = ({ data = [] }) => {
  const chartData = useMemo(
    () =>
      data.map((item) => {
        const count = Number(item.order_count) || 0;
        let percentage = 0;
        if (count > 0) {
          if (count < 10) percentage = 10;
          else if (count < 20) percentage = 20;
          else if (count < 50) percentage = 50;
          else if (count <= 100) percentage = 80;
          else percentage = 100;
        }
        return {
          ...item,
          package_name: item.package_name || 'Tanpa nama paket',
          order_count: count,
          popularity_percentage: percentage,
          short_name: truncateLabel(item.package_name),
        };
      }),
    [data],
  );

  const chartHeight = Math.max(280, chartData.length * 52 + 40);

  const yAxisWidth = useMemo(() => {
    const longest = chartData.reduce(
      (max, d) => Math.max(max, String(d.short_name || '').length),
      4,
    );
    return Math.min(160, Math.max(44, longest * 7 + 12));
  }, [chartData]);

  return (
    <div>
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
            domain={[0, 100]}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
            tickFormatter={(val) => `${val}%`}
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
            content={(props) => <ChartTooltip {...props} />}
          />
          <Bar
            dataKey="popularity_percentage"
            fill="url(#packageSalesGradient)"
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
