import React, { useMemo } from "react";
import PieChart from "./charts/PieChart";

const OPPORTUNITY_STATUS_COLUMNS = [
  { key: "total", label: "Total Opportunities Identified" },
  { key: "underObservation", label: "Under Observation" },
  { key: "inProgress", label: "In progress" },
  { key: "notOccurred", label: "Not Occurred" },
  { key: "leveraged", label: "Opportunity Leveraged" },
  { key: "closed", label: "Closed" }
];

const normalizeStatus = (value) => {
  if (!value) return "";
  return value.toString().toLowerCase().replace(/[^a-z0-9]/g, "");
};

const mapNormalizedToKey = {
  underobservation: "underObservation",
  inprogress: "inProgress",
  notoccured: "notOccurred",
  notoccurred: "notOccurred",
  opportunityleveraged: "leveraged",
  closed: "closed"
};

const OpportunityStatusInsightTable = ({ opportunityRegister = [] }) => {
  const counts = useMemo(() => {
    const tally = {
      total: opportunityRegister.length,
      underObservation: 0,
      inProgress: 0,
      notOccurred: 0,
      leveraged: 0,
      closed: 0
    };

    opportunityRegister.forEach((opportunity) => {
      const normalized = normalizeStatus(opportunity?.status);
      const key = mapNormalizedToKey[normalized];
      if (key) {
        tally[key] = (tally[key] || 0) + 1;
      }
    });

    return tally;
  }, [opportunityRegister]);

  const chartData = useMemo(() => {
    const labels = OPPORTUNITY_STATUS_COLUMNS.filter((column) => column.key !== "total");
    return labels
      .map((column) => ({
        label: column.label,
        value: counts[column.key] || 0
      }))
      .filter((item) => item.value > 0);
  }, [counts]);

  return (
    <div className="opportunity-status-insight insight-card">
      <div className="insight-summary-header">
        <div className="insight-summary-header__titles">
          <span className="insight-summary-header__eyebrow">Status Overview</span>
          <h4 className="insight-summary-header__title">Opportunity Status Summary</h4>
        </div>
        <div className="insight-summary-total" aria-label="Total opportunities identified">
          <span className="insight-summary-total__label">Total Opportunities</span>
          <span className="insight-summary-total__value">{counts.total}</span>
        </div>
      </div>
      <div className="insight-summary-body">
        <div className="opportunity-status-insight__chart insight-summary-panel">
          <PieChart
            data={chartData}
            emptyMessage="No opportunity status insights available"
            totalLabel="Total Opportunities"
            valueFormatter={(value) => value.toString()}
          />
        </div>
        <div className="opportunity-status-insight__table-wrapper insight-summary-panel">
          <table className="opportunity-status-insight__table">
            <thead>
              <tr>
                <th scope="col" colSpan={OPPORTUNITY_STATUS_COLUMNS.length}>
                  Status Breakdown
                </th>
              </tr>
              <tr>
                {OPPORTUNITY_STATUS_COLUMNS.map((column) => (
                  <th key={column.key} scope="col">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {OPPORTUNITY_STATUS_COLUMNS.map((column) => (
                  <td key={column.key}>{counts[column.key] || 0}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OpportunityStatusInsightTable;
