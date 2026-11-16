import { Bar, Line } from 'react-chartjs-2';
import { formatCurrency } from '../../utils/formatCurrency';

const numberFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

// Axis ticks stay short ("1,5 tỷ", "250 tr"); tooltips and the table show the exact amount.
export const compactMoney = (value) => {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1e9) return `${numberFormat.format(amount / 1e9)} tỷ`;
  if (Math.abs(amount) >= 1e6) return `${numberFormat.format(amount / 1e6)} tr`;
  if (Math.abs(amount) >= 1e3) return `${numberFormat.format(amount / 1e3)}K`;
  return numberFormat.format(amount);
};

// Colors arrive as rgba() from toCanvasColor; the area fill reuses the accent at a lower opacity.
const withAlpha = (color, alpha) => {
  const match = /^rgba?\(([^,]+),([^,]+),([^,)]+)/.exec(color || '');
  return match ? `rgba(${match[1].trim()}, ${match[2].trim()}, ${match[3].trim()}, ${alpha})` : color;
};

// Area fill fades from the line down to the x axis, so the outline stays the focus.
const areaFill = (accent) => ({ chart }) => {
  const { ctx, chartArea } = chart;
  if (!chartArea) return withAlpha(accent, 0.12);
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, withAlpha(accent, 0.28));
  gradient.addColorStop(1, withAlpha(accent, 0));
  return gradient;
};

// One revenue series per chart. "bar": a single gold column per period, rounded at the data end only.
// "area": a thin gold line with a point per period over a faded fill, for long day-by-day series.
export default function RevenueChart({ title, subtitle, labels, values, tooltipTitle, colors, maxBarThickness = 24, tableLabel, variant = 'bar' }) {
  const isArea = variant === 'area';
  const total = values.reduce((sum, value) => sum + value, 0);
  const best = values.reduce((bestIndex, value, index) => (value > values[bestIndex] ? index : bestIndex), 0);
  const dataset = isArea ? {
    label: 'Doanh thu',
    data: values,
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: areaFill(colors.accent),
    fill: 'origin',
    // Monotone keeps the curve from dipping below zero between days without revenue.
    cubicInterpolationMode: 'monotone',
    pointRadius: 2.5,
    pointBackgroundColor: colors.accent,
    pointBorderWidth: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: colors.accentHover,
    pointHoverBorderWidth: 0,
  } : {
    label: 'Doanh thu',
    data: values,
    backgroundColor: colors.accent,
    hoverBackgroundColor: colors.accentHover,
    borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
    borderSkipped: 'start',
    maxBarThickness,
    categoryPercentage: 0.8,
    barPercentage: 0.9,
  };
  const data = { labels, datasets: [dataset] };
  const ChartType = isArea ? Line : Bar;
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        callbacks: {
          title: (items) => (tooltipTitle ? tooltipTitle(items[0].dataIndex) : items[0].label),
          label: (item) => formatCurrency(item.parsed.y),
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        // An empty period still gets a money scale instead of 0 / 0,5 / 1.
        suggestedMax: total === 0 ? 1000000 : undefined,
        border: { display: false },
        grid: { color: colors.rule },
        ticks: { maxTicksLimit: 5, callback: (value) => compactMoney(value) },
      },
      x: { grid: { display: false }, ticks: { autoSkip: true, maxRotation: 0 } },
    },
  };

  return (
    <div className="admin-card chart-card revenue-chart">
      <div className="card-heading">
        <div><h2>{title}</h2><span>{subtitle}</span></div>
        <div className="revenue-total"><small>Tổng</small><strong>{formatCurrency(total)}</strong></div>
      </div>
      <div className="revenue-canvas">
        <ChartType data={data} options={options} aria-label={`${title}: tổng ${formatCurrency(total)}`} role="img" />
        {total === 0 && <p className="revenue-empty">Chưa có doanh thu trong giai đoạn này</p>}
      </div>
      <details className="revenue-table">
        <summary>Xem bảng số liệu{total > 0 ? ` · cao nhất: ${tooltipTitle ? tooltipTitle(best) : labels[best]}` : ''}</summary>
        <table>
          <thead><tr><th>{tableLabel}</th><th>Doanh thu</th></tr></thead>
          <tbody>
            {values.map((value, index) => (value > 0 ? (
              <tr key={labels[index]}><td>{tooltipTitle ? tooltipTitle(index) : labels[index]}</td><td>{formatCurrency(value)}</td></tr>
            ) : null))}
            {total === 0 && <tr><td colSpan="2">Chưa có doanh thu trong giai đoạn này</td></tr>}
          </tbody>
        </table>
      </details>
    </div>
  );
}
