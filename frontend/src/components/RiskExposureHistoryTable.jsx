import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PlusCircle, Pencil, Trash2, XCircle } from "lucide-react";
import { useGlobalSearch } from "../context/GlobalSearchContext";
import { SectionItemContext } from "./SectionLayout";
import { buildTableSearchItems } from "../utils/searchRegistry";
import MultiLineTrendChart from "./charts/MultiLineTrendChart";

const ALLOWED_EXPOSURE_VALUES = ["1", "2", "3", "4", "6", "9"];

const normalizeDateInput = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

const formatDateForDisplay = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
};

const sortDateKeys = (values) => {
  return values.sort((a, b) => {
    const aDate = new Date(a);
    const bDate = new Date(b);

    if (!Number.isNaN(aDate.getTime()) && !Number.isNaN(bDate.getTime())) {
      return aDate.getTime() - bDate.getTime();
    }

    return String(a).localeCompare(String(b), undefined, {
      sensitivity: "base",
      numeric: true
    });
  });
};

const RiskExposureHistoryTable = ({
  riskExposures = [],
  riskRegister = [],
  onAdd,
  onEdit,
  onDelete,
  isEditor,
  loading
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [activeRowId, setActiveRowId] =useState(null);
  const [formValues, setFormValues] = useState({ risk: "", date: "", exposure_value: "" });
  const [rowEditRiskId, setRowEditRiskId] = useState(null);
  const [rowEditEntries, setRowEditEntries] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { searchTerm, registerSource, navigateToSection } = useGlobalSearch();
  const sectionContext = useContext(SectionItemContext);

  const anchorPrefix = useMemo(() => {
    if (!sectionContext?.projectId || !sectionContext?.sectionId || !sectionContext?.itemId) {
      return null;
    }

    return `search-${sectionContext.projectId}-${sectionContext.sectionId}-${sectionContext.itemId}`;
  }, [sectionContext?.projectId, sectionContext?.sectionId, sectionContext?.itemId]);

  const riskDetailsMap = useMemo(() => {
    const details = new Map();
    riskRegister.forEach((row) => {
      if (row?.risk_id) {
        details.set(row.risk_id, row);
      }
    });
    return details;
  }, [riskRegister]);

  const resolveInitialExposure = useCallback((details = {}) => {
    const probability = Number(details?.probability);
    const impact = Number(details?.impact);

    if (Number.isFinite(probability) && Number.isFinite(impact)) {
      const product = probability * impact;
      return Number.isFinite(product) ? String(product) : "";
    }

    return "";
  }, []);

  const initialExposureEntries = useMemo(() => {
    return riskRegister
      .map((row) => {
        const riskId = row?.risk_id;
        const normalizedDate = normalizeDateInput(row?.date_of_risk_identification);
        const value = resolveInitialExposure(row);

        if (!riskId || !normalizedDate || value === "") {
          return null;
        }

        return {
          riskId,
          normalizedDate,
          value
        };
      })
      .filter(Boolean);
  }, [riskRegister, resolveInitialExposure]);

  const initialExposureByRisk = useMemo(() => {
    const map = new Map();
    initialExposureEntries.forEach((entry) => {
      map.set(entry.riskId, entry);
    });
    return map;
  }, [initialExposureEntries]);

  const exposuresByRisk = useMemo(() => {
    const map = new Map();

    riskExposures.forEach((row) => {
      const riskId = row?.risk;
      if (!riskId) {
        return;
      }

      const normalizedDate = normalizeDateInput(row.date) || row.date || "";
      if (!map.has(riskId)) {
        map.set(riskId, {});
      }

      map.get(riskId)[normalizedDate] = {
        rowId: row.id,
        normalizedDate,
        originalDate: row.date,
        value: row.exposure_value ?? ""
      };
    });

    return map;
  }, [riskExposures]);

  const uniqueDates = useMemo(() => {
    const dates = new Set();
    riskExposures.forEach((row) => {
      const normalizedDate = normalizeDateInput(row.date) || row.date || "";
      if (normalizedDate) {
        dates.add(normalizedDate);
      }
    });

    return sortDateKeys(Array.from(dates));
  }, [riskExposures]);

  const chartDates = useMemo(() => {
    const dates = new Set(uniqueDates);
    initialExposureEntries.forEach((entry) => {
      dates.add(entry.normalizedDate);
    });

    return sortDateKeys(Array.from(dates));
  }, [initialExposureEntries, uniqueDates]);

  const riskIds = useMemo(() => {
    const ids = new Set();

    riskRegister.forEach((row) => {
      if (row?.risk_id) {
        ids.add(row.risk_id);
      }
    });

    riskExposures.forEach((row) => {
      if (row?.risk) {
        ids.add(row.risk);
      }
    });

    return Array.from(ids).sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true })
    );
  }, [riskRegister, riskExposures]);

  const columnDefinitions = useMemo(() => {
    const baseColumns = [
      { key: "risk", label: "Risk" },
      { key: "date_of_risk_identified", label: "Date of Risk Identified" },
      { key: "initial_exposure_value", label: "Initial Exposure Value" }
    ];

    const dateColumns = uniqueDates.map((dateKey) => ({
      key: `risk_on_${dateKey}`,
      label: `Risk on ${formatDateForDisplay(dateKey) || dateKey}`,
      dateKey
    }));

    return [...baseColumns, ...dateColumns];
  }, [uniqueDates]);

  const tableRows = useMemo(() => {
    return riskIds.map((riskId) => {
      const details = riskDetailsMap.get(riskId) || {};
      const exposures = exposuresByRisk.get(riskId) || {};

      const values = {
        risk: riskId,
        date_of_risk_identified: details.date_of_risk_identification || "",
        initial_exposure_value: resolveInitialExposure(details)
      };

      const cells = {};
      uniqueDates.forEach((dateKey) => {
        const columnKey = `risk_on_${dateKey}`;
        const exposure = exposures[dateKey];
        values[columnKey] = exposure?.value || "";
        cells[columnKey] = exposure || null;
      });

      return {
        riskId,
        values,
        cells
      };
    });
  }, [riskDetailsMap, exposuresByRisk, riskIds, uniqueDates, resolveInitialExposure]);

  const trendSeries = useMemo(() => {
    return riskIds
      .map((riskId) => {
        const exposures = exposuresByRisk.get(riskId) || {};
        const details = riskDetailsMap.get(riskId) || {};
        const initialEntry = initialExposureByRisk.get(riskId);

        const values = chartDates.map((dateKey) => {
          const entry = exposures[dateKey];
          const entryValue = entry?.value;

          if (entryValue === null || entryValue === undefined || entryValue === "") {
            if (initialEntry && initialEntry.normalizedDate === dateKey) {
              const numericInitial = Number(initialEntry.value);
              return Number.isFinite(numericInitial) ? numericInitial : null;
            }
            return null;
          }

          const numeric = Number(entryValue);
          return Number.isFinite(numeric) ? numeric : null;
        });

        if (!values.some((value) => value !== null)) {
          return null;
        }

        const descriptor = details.risk_description
          ? ` - ${String(details.risk_description).slice(0, 40)}`
          : "";

        return {
          id: riskId,
          label: `Risk ${riskId}${descriptor}`,
          values
        };
      })
      .filter(Boolean);
  }, [
    chartDates,
    exposuresByRisk,
    initialExposureByRisk,
    riskDetailsMap,
    riskIds
  ]);

  useEffect(() => {
    if (
      !registerSource ||
      !sectionContext?.projectId ||
      !sectionContext?.sectionId ||
      !sectionContext?.itemId
    ) {
      return undefined;
    }

    const sourceId = `${sectionContext.projectId}-${sectionContext.sectionId}-${sectionContext.itemId}`;
    const rowsForSearch = tableRows.map((row) => ({ id: row.riskId, ...row.values }));

    const unregister = registerSource({
      id: sourceId,
      getItems: () =>
        buildTableSearchItems({
          projectId: sectionContext.projectId,
          sectionId: sectionContext.sectionId,
          sectionLabel: sectionContext.sectionLabel,
          tableId: sectionContext.itemId,
          tableLabel: sectionContext.itemLabel,
          rows: rowsForSearch,
          columns: columnDefinitions.map(({ key, label }) => ({ key, label })),
          navigateToSection,
          anchorPrefix
        })
    });

    return unregister;
  }, [
    anchorPrefix,
    columnDefinitions,
    navigateToSection,
    registerSource,
    sectionContext?.itemId,
    sectionContext?.itemLabel,
    sectionContext?.projectId,
    sectionContext?.sectionId,
    sectionContext?.sectionLabel,
    tableRows
  ]);

  const openAddModal = () => {
    setFormValues({ risk: "", date: "", exposure_value: "" });
    setModalMode("add");
    setRowEditRiskId(null);
    setRowEditEntries([]);
    setIsModalOpen(true);
  };

  const openEditModal = (riskId) => {
    const exposures = exposuresByRisk.get(riskId) || {};
    const entries = sortDateKeys(Object.keys(exposures)).map((dateKey) => {
      const entry = exposures[dateKey];
      return {
        rowId: entry?.rowId || null,
        date: normalizeDateInput(entry?.originalDate) || entry?.normalizedDate || "",
        exposure_value:
          entry?.value === null || entry?.value === undefined || entry?.value === ""
            ? ""
            : String(entry.value)
      };
    });

    setFormValues({ risk: "", date: "", exposure_value: "" });
    setRowEditRiskId(riskId);
    setRowEditEntries(entries);
    setModalMode("row-edit");
    setIsModalOpen(true);
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setFormValues({ risk: "", date: "", exposure_value: "" });
    setRowEditRiskId(null);
    setRowEditEntries([]);
    setModalMode("add");
    setIsSubmitting(false);
  };

  const handleAddSubmit = async () => {
    const riskId = formValues.risk;
    const normalizedDate = normalizeDateInput(formValues.date);
    const exposureValue = formValues.exposure_value;

    if (!riskId) {
      alert("Please select a risk before saving.");
      return;
    }

    if (!normalizedDate) {
      alert("Please provide a valid date.");
      return;
    }

    if (!ALLOWED_EXPOSURE_VALUES.includes(exposureValue)) {
      alert("Please select a valid exposure value.");
      return;
    }

    const riskDetails = riskDetailsMap.get(riskId) || {};
    const identifiedDate = normalizeDateInput(riskDetails.date_of_risk_identification);

    if (identifiedDate && normalizedDate < identifiedDate) {
      alert("Review date cannot be before the risk identification date.");
      return;
    }

    const exposuresForRisk = exposuresByRisk.get(riskId) || {};
    const existing = exposuresForRisk[normalizedDate];

    if (modalMode === "add" && existing) {
      alert("An entry already exists for this risk on the selected date.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      risk: riskId,
      date: normalizedDate,
      exposure_value: exposureValue
    };

    try {
      await onAdd(payload);
      resetModal();
    } catch (error) {
      console.error("Failed to save exposure history", error);
      setIsSubmitting(false);
    }
  };

  const handleRowEditSubmit = async () => {
    if (!rowEditRiskId) {
      alert("No risk selected to edit.");
      return;
    }

    if (rowEditEntries.length === 0) {
      resetModal();
      return;
    }

    const normalizedEntries = [];
    const seenDates = new Set();
    const riskDetails = riskDetailsMap.get(rowEditRiskId) || {};
    const identifiedDate = normalizeDateInput(riskDetails.date_of_risk_identification);

    for (const entry of rowEditEntries) {
      const normalizedDate = normalizeDateInput(entry.date);
      const exposureValue = entry.exposure_value;

      if (!entry.rowId) {
        continue;
      }

      if (!normalizedDate) {
        alert("Please provide a valid date for all exposure entries.");
        return;
      }

      if (!ALLOWED_EXPOSURE_VALUES.includes(exposureValue)) {
        alert("Please select a valid exposure value for all entries.");
        return;
      }

      if (identifiedDate && normalizedDate < identifiedDate) {
        alert("Review dates cannot be before the risk identification date.");
        return;
      }

      if (seenDates.has(normalizedDate)) {
        alert("Each exposure entry must have a unique date.");
        return;
      }

      seenDates.add(normalizedDate);
      normalizedEntries.push({
        rowId: entry.rowId,
        normalizedDate,
        exposureValue
      });
    }

    if (normalizedEntries.length === 0) {
      resetModal();
      return;
    }

    setIsSubmitting(true);

    try {
      await Promise.all(
        normalizedEntries.map((entry) =>
          onEdit(entry.rowId, {
            risk: rowEditRiskId,
            date: entry.normalizedDate,
            exposure_value: entry.exposureValue
          })
        )
      );
      resetModal();
    } catch (error) {
      console.error("Failed to update exposure history", error);
      setIsSubmitting(false);
    }
  };

  const updateRowEditEntry = (index, updates) => {
    setRowEditEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              ...updates
            }
          : entry
      )
    );
  };

  const handleDelete = async (rowId) => {
    if (!rowId) return;
    if (!window.confirm("Delete this exposure history entry?")) {
      return;
    }

    try {
      await onDelete(rowId);
    } catch (error) {
      console.error("Failed to delete exposure history entry", error);
    }
  };

  const selectedRiskDetailsForAdd = riskDetailsMap.get(formValues.risk) || {};
  const identifiedDateDisplay = formatDateForDisplay(
    selectedRiskDetailsForAdd.date_of_risk_identification
  );
  const initialExposure = resolveInitialExposure(selectedRiskDetailsForAdd);

  const rowEditRiskDetails = riskDetailsMap.get(rowEditRiskId) || {};
  const rowEditIdentifiedDateDisplay = formatDateForDisplay(
    rowEditRiskDetails.date_of_risk_identification
  );
  const rowEditInitialExposure = resolveInitialExposure(rowEditRiskDetails);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  useEffect(() => {
    if (modalMode !== "edit") {
      return;
    }

    const riskId = formValues.risk;
    const dateValue = formValues.date;

    if (!riskId || !dateValue) {
      setActiveRowId(null);
      return;
    }

    const exposures = exposuresByRisk.get(riskId);
    if (!exposures) {
      setActiveRowId(null);
      return;
    }

    const normalizedDate = normalizeDateInput(dateValue);
    const match = exposures[normalizedDate];

    if (!match) {
      return;
    }

    if (match.rowId !== activeRowId) {
      setActiveRowId(match.rowId);
    }
  }, [modalMode, formValues.risk, formValues.date, exposuresByRisk, activeRowId]);

  const resolveExposureClass = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return "";
    }

    if (numericValue >= 6) {
      return "risk-exposure-history-value--high";
    }

    if (numericValue >= 3) {
      return "risk-exposure-history-value--medium";
    }

    if (numericValue >= 1) {
      return "risk-exposure-history-value--low";
    }

    return "";
  };

  const renderExposureValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return <span className="muted-text">-</span>;
    }

    const displayValue = String(value);
    const levelClass = resolveExposureClass(displayValue);

    return (
      <span className={`risk-exposure-history-value ${levelClass}`.trim()}>{displayValue}</span>
    );
  };

  return (
    <div className="risk-exposure-history-grid">
      <div className="risk-exposure-history-chart insight-card">
        <MultiLineTrendChart
          labels={chartDates}
          series={trendSeries}
          labelFormatter={(label) => formatDateForDisplay(label) || label}
          valueFormatter={(value) => value.toString()}
          emptyMessage="Add exposure history entries to see the risk exposure trend"
        />
      </div>
      <div
        className="table-toolbar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          gap: "1rem",
          flexWrap: "wrap"
        }}
      >
        <div className="table-search-message">
          {normalizedSearch && (
            <span>
              Showing results for <strong>"{searchTerm}"</strong>
            </span>
          )}
        </div>
        {isEditor && (
          <button
            className="btn btn-primary btn-icon"
            onClick={openAddModal}
            disabled={riskIds.length === 0}
            title={riskIds.length === 0 ? "Add risks in the mitigation table first" : undefined}
          >
            <PlusCircle size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading risk exposure history...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {columnDefinitions.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                {isEditor && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={columnDefinitions.length + (isEditor ? 1 : 0)}>
                    <div className="empty-state">
                      {riskIds.length === 0
                        ? "Add risks in the mitigation & contingency table to begin tracking exposure history."
                        : "No risk exposure history recorded yet."}
                    </div>
                  </td>
                </tr>
              ) : (
                tableRows.map((row) => (
                  <tr
                    key={row.riskId}
                    id={anchorPrefix ? `${anchorPrefix}-row-${row.riskId}` : undefined}
                    data-search-table={sectionContext?.itemId || undefined}
                    data-search-row={row.riskId}
                  >
                    <td data-label="Risk">{row.values.risk}</td>
                    <td data-label="Date of Risk Identified">
                      {formatDateForDisplay(row.values.date_of_risk_identified) || row.values.date_of_risk_identified || "-"}
                    </td>
                    <td data-label="Initial Exposure Value">
                      {renderExposureValue(row.values.initial_exposure_value)}
                    </td>
                    {uniqueDates.map((dateKey) => {
                      const columnKey = `risk_on_${dateKey}`;
                      const cell = row.cells[columnKey];
                      const label = `Risk on ${formatDateForDisplay(dateKey) || dateKey}`;
                      return (
                        <td key={columnKey} data-label={label}>
                          {cell ? (
                            <div className="risk-exposure-history-cell">
                              {renderExposureValue(cell.value)}
                              {isEditor && (
                                <div className="risk-exposure-history-actions">
                                  <button
                                    className="btn btn-danger btn-icon"
                                    onClick={() => handleDelete(cell.rowId)}
                                    aria-label={`Delete exposure for ${row.riskId} on ${label}`}
                                  >
                                    <Trash2 size={16} aria-hidden="true" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="muted-text">-</span>
                          )}
                        </td>
                      );
                    })}
                    {isEditor && (
                      <td data-label="Actions">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openEditModal(row.riskId)}
                          type="button"
                        >
                          <Pencil size={16} aria-hidden="true" style={{ marginRight: "0.25rem" }} />
                          Edit Row
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={resetModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === "row-edit" ? "Edit Exposure History" : "Add Exposure History"}
              </h2>
              <button className="close-btn" onClick={resetModal} aria-label="Close">
                <XCircle size={18} aria-hidden="true" />
              </button>
            </div>

            {modalMode === "row-edit" ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleRowEditSubmit();
                }}
              >
                <div className="form-group">
                  <label className="label">Risk</label>
                  <div className="risk-exposure-history-meta">{rowEditRiskId || "Not available"}</div>
                </div>

                <div className="form-group">
                  <label className="label">Date of Risk Identified</label>
                  <div className="risk-exposure-history-meta">
                    {rowEditIdentifiedDateDisplay ||
                      rowEditRiskDetails.date_of_risk_identification ||
                      "Not available"}
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">Initial Exposure Value</label>
                  <div className="risk-exposure-history-meta">
                    {rowEditInitialExposure === null ||
                    rowEditInitialExposure === undefined ||
                    rowEditInitialExposure === ""
                      ? "Not available"
                      : renderExposureValue(rowEditInitialExposure)}
                  </div>
                </div>

                <div className="form-divider" style={{ margin: "1.5rem 0" }} />

                {rowEditEntries.length === 0 ? (
                  <div className="empty-state" style={{ marginBottom: "1.5rem" }}>
                    No exposure history entries recorded for this risk yet.
                  </div>
                ) : (
                  <div className="table-container" style={{ marginBottom: "1.5rem" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th scope="col">Review Date</th>
                          <th scope="col">Exposure Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowEditEntries.map((entry, index) => (
                          <tr key={entry.rowId || entry.date || index}>
                            <td data-label="Review Date">
                              {formatDateForDisplay(entry.date) || entry.date || "-"}
                            </td>
                            <td data-label="Exposure Value">
                              <select
                                id={`risk-edit-value-${index}`}
                                className="input"
                                value={entry.exposure_value}
                                onChange={(event) =>
                                  updateRowEditEntry(index, {
                                    exposure_value: event.target.value
                                  })
                                }
                                required
                              >
                                <option value="" disabled>
                                  Select exposure value
                                </option>
                                {ALLOWED_EXPOSURE_VALUES.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                  <button
                    type="submit"
                    className="btn btn-success"
                    style={{ flex: 1, justifyContent: "center" }}
                    disabled={isSubmitting || rowEditEntries.length === 0}
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={resetModal}
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleAddSubmit();
                }}
              >
                <div className="form-group">
                  <label className="label" htmlFor="risk-select">
                    Risk
                  </label>
                  <select
                    id="risk-select"
                    className="input"
                    value={formValues.risk}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        risk: event.target.value
                      }))
                    }
                    required
                  >
                    <option value="" disabled>
                      Select risk ID
                    </option>
                    {riskIds.map((riskId) => (
                      <option key={riskId} value={riskId}>
                        {riskId}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label" htmlFor="risk-date">
                    Date
                  </label>
                  <input
                    id="risk-date"
                    type="date"
                    className="input"
                    value={formValues.date}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        date: event.target.value
                      }))
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label" htmlFor="exposure-value">
                    Exposure Value
                  </label>
                  <select
                    id="exposure-value"
                    className="input"
                    value={formValues.exposure_value}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        exposure_value: event.target.value
                      }))
                    }
                    required
                  >
                    <option value="" disabled>
                      Select exposure value
                    </option>
                    {ALLOWED_EXPOSURE_VALUES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Date of Risk Identified</label>
                  <div className="risk-exposure-history-meta">
                    {identifiedDateDisplay ||
                      selectedRiskDetailsForAdd.date_of_risk_identification ||
                      "Not available"}
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">Initial Exposure Value</label>
                  <div className="risk-exposure-history-meta">
                    {initialExposure === null ||
                    initialExposure === undefined ||
                    initialExposure === ""
                      ? "Not available"
                      : renderExposureValue(initialExposure)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                  <button
                    type="submit"
                    className="btn btn-success"
                    style={{ flex: 1, justifyContent: "center" }}
                    disabled={isSubmitting}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={resetModal}
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    Discard
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskExposureHistoryTable;

