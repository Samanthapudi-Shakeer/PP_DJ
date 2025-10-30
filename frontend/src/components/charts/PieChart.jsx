import React from "react";
import clsx from "clsx";
import { getChartColor } from "../../utils/chartColors";

const formatPercent = (value) => {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${(value * 100).toFixed(value * 100 >= 10 ? 0 : 1)}%`;
};

const PieChart = ({
  data = [],
  emptyMessage = "No data available",
  totalLabel = "Total",
  valueFormatter = (value) => value,
  className
}) => {
  const segments = Array.isArray(data)
    ? data
        .filter((item) => item && Number.isFinite(Number(item.value)) && Number(item.value) > 0)
        .map((item, index) => ({
          label: item.label || item.key || `Segment ${index + 1}`,
          value: Number(item.value) || 0,
          color: item.color || getChartColor(index)
        }))
    : [];

  if (!segments.length) {
    return (
      <div className={clsx("pie-chart pie-chart--empty", className)}>
        <p className="pie-chart__empty">{emptyMessage}</p>
      </div>
    );
  }

  const total = segments.reduce((sum, item) => sum + item.value, 0);

  if (!Number.isFinite(total) || total <= 0) {
    return (
      <div className={clsx("pie-chart pie-chart--empty", className)}>
        <p className="pie-chart__empty">{emptyMessage}</p>
      </div>
    );
  }

  let cumulative = 0;
  const computedSegments = segments.map((item, index) => {
    const percent = item.value / total;
    const start = cumulative;
    cumulative += percent;
    const isLast = index === segments.length - 1;
    const end = isLast ? 1 : cumulative;

    return {
      ...item,
      percent,
      start,
      end
    };
  });

  const gradientStops = computedSegments
    .map((segment) => {
      const start = `${(segment.start * 100).toFixed(4)}%`;
      const end = `${(segment.end * 100).toFixed(4)}%`;
      return `${segment.color} ${start} ${end}`;
    })
    .join(", ");

  const ariaDescription = computedSegments
    .map((segment) => `${segment.label}: ${valueFormatter(segment.value)} (${formatPercent(segment.percent)})`)
    .join(", ");

  return (
    <div className={clsx("pie-chart", className)}>
      <div className="pie-chart__graphic-wrapper">
        <div
          className="pie-chart__graphic"
          style={{ backgroundImage: `conic-gradient(${gradientStops})` }}
          role="img"
          aria-label={`Pie chart showing distribution: ${ariaDescription}`}
        />
        <div className="pie-chart__center">
          <span className="pie-chart__center-value">{valueFormatter(total)}</span>
          <span className="pie-chart__center-label">{totalLabel}</span>
        </div>
      </div>
      <ul className="pie-chart__legend">
        {computedSegments.map((segment) => (
          <li key={segment.label} className="pie-chart__legend-item">
            <span className="pie-chart__legend-swatch" style={{ backgroundColor: segment.color }} aria-hidden />
            <div className="pie-chart__legend-text">
              <span className="pie-chart__legend-label">{segment.label}</span>
              <span className="pie-chart__legend-value">
                {valueFormatter(segment.value)}
                <span className="pie-chart__legend-percent">{formatPercent(segment.percent)}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PieChart;
