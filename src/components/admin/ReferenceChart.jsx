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
      <p className="font-semibold text-gray-800 mb-1.5 capitalize">{item.displayName}</p>
      <p className="text-gray-600 text-xs mb-1">
        <span className="font-medium text-gray-700">Jumlah Client:</span> {item.value}
      </p>
    </div>
  );
};

const ReferenceChart = ({ data = [] }) => {
  const chartData = useMemo(() => {
    const getStandardKey = (name) => {
      if (!name) return '';
      const lowercase = name.toLowerCase().trim();
      if (lowercase === 'instagram' || lowercase === 'ig') return 'instagram';
      if (lowercase === 'tiktok') return 'tiktok';
      if (lowercase === 'facebook' || lowercase === 'fb') return 'facebook';
      if (lowercase === 'google') return 'google';
      if (lowercase === 'teman' || lowercase === 'rekomendasi') return 'teman';
      return '';
    };

    const counts = {
      instagram: 0,
      tiktok: 0,
      facebook: 0,
      google: 0,
      teman: 0
    };

    data.forEach((item) => {
      const key = getStandardKey(item.name);
      if (counts[key] !== undefined) {
        counts[key] += Number(item.value) || 0;
      }
    });

    const displayNames = {
      instagram: 'Instagram',
      tiktok: 'TikTok',
      facebook: 'Facebook',
      google: 'Google / Pencarian',
      teman: 'Teman / Kerabat'
    };

    return Object.keys(counts).map((key) => {
      const displayName = displayNames[key];
      return {
        name: key,
        displayName,
        value: counts[key],
        short_name: truncateLabel(displayName),
      };
    }).sort((a, b) => b.value - a.value);
  }, [data]);

  const chartHeight = useMemo(() => {
    return Math.max(220, chartData.length * 52 + 40);
  }, [chartData]);

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
            <linearGradient id="referenceGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
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
            cursor={{ fill: 'rgba(236, 72, 153, 0.04)' }}
            content={(props) => <ChartTooltip {...props} />}
          />
          <Bar
            dataKey="value"
            fill="url(#referenceGradient)"
            radius={[0, 6, 6, 0]}
            maxBarSize={28}
            animationDuration={600}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ReferenceChart;
