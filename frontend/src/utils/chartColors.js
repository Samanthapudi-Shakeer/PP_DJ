const CHART_COLORS = [
  "#2563eb",
  "#f97316",
  "#0ea5e9",
  "#16a34a",
  "#9333ea",
  "#ef4444",
  "#14b8a6",
  "#f59e0b",
  "#6366f1",
  "#ec4899"
];

const hexToRgba = (hex, alpha = 1) => {
  if (!hex || typeof hex !== "string") {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  let normalized = hex.replace("#", "");

  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (normalized.length !== 6) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const bigint = Number.parseInt(normalized, 16);

  if (Number.isNaN(bigint)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const r = (bigint >> 16) & 0xff;
  const g = (bigint >> 8) & 0xff;
  const b = bigint & 0xff;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getChartColor = (index = 0) => CHART_COLORS[index % CHART_COLORS.length];

export const getChartFillColor = (index = 0, alpha = 0.18) =>
  hexToRgba(getChartColor(index), alpha);

export default CHART_COLORS;
