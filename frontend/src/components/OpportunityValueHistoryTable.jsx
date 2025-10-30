import React, { useContext, useEffect, useMemo, useState } from "react";
import { PlusCircle, Pencil, Trash2, XCircle } from "lucide-react";
import { useGlobalSearch } from "../context/GlobalSearchContext";
import { SectionItemContext } from "./SectionLayout";
import { buildTableSearchItems } from "../utils/searchRegistry";
import MultiLineTrendChart from "./charts/MultiLineTrendChart";
import {
  ALLOWED_OPPORTUNITY_VALUES,
  deriveOpportunityValue,
  getOpportunityValueClassName
} from "../utils/opportunityValue";

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

const OpportunityValueHistoryTable = ({
  opportunityValues = [],
  opportunityRegister = [],
  onAdd,
  onEdit,
  onDelete,
  isEditor,
  loading
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formValues, setFormValues] = useState({
    opportunity: "",
    date: "",
    opportunity_value: ""
  });
  const [rowEditOpportunityId, setRowEditOpportunityId] = useState(null);
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

  const opportunityDetailsMap = useMemo(() => {
    const details = new Map();
    opportunityRegister.forEach((row) => {
      if (row?.opportunity_id) {
        details.set(row.opportunity_id, row);
      }
    });
    return details;
  }, [opportunityRegister]);

  const initialOpportunityEntries = useMemo(() => {
    return opportunityRegister
      .map((row) => {
        const opportunityId = row?.opportunity_id;
        const normalizedDate = normalizeDateInput(row?.date_of_identification);
        const derivedInitialValue = deriveOpportunityValue(row);
        const fallbackInitialValue =
          derivedInitialValue ||
          (row?.opportunity_value !== null && row?.opportunity_value !== undefined
            ? String(row.opportunity_value)
            : "");

        if (!opportunityId || !normalizedDate || fallbackInitialValue === "") {
          return null;
        }

        return {
          opportunityId,
          normalizedDate,
          value: fallbackInitialValue
        };
      })
      .filter(Boolean);
  }, [opportunityRegister]);

  const initialOpportunityById = useMemo(() => {
    const map = new Map();
    initialOpportunityEntries.forEach((entry) => {
      map.set(entry.opportunityId, entry);
    });
    return map;
  }, [initialOpportunityEntries]);

  const valuesByOpportunity = useMemo(() => {
    const map = new Map();

    opportunityValues.forEach((row) => {
      const opportunityId = row?.opportunity;
      if (!opportunityId) {
        return;
      }

      const normalizedDate = normalizeDateInput(row.date) || row.date || "";
      if (!map.has(opportunityId)) {
        map.set(opportunityId, {});
      }

      const resolvedValue =
        row.opportunity_value !== null && row.opportunity_value !== undefined
          ? String(row.opportunity_value)
          : "";

      map.get(opportunityId)[normalizedDate] = {
        rowId: row.id,
        normalizedDate,
        originalDate: row.date,
        value: resolvedValue
      };
    });

    return map;
  }, [opportunityValues]);

  const uniqueDates = useMemo(() => {
    const dates = new Set();
    opportunityValues.forEach((row) => {
      const normalizedDate = normalizeDateInput(row.date) || row.date || "";
      if (normalizedDate) {
        dates.add(normalizedDate);
      }
    });

    return sortDateKeys(Array.from(dates));
  }, [opportunityValues]);

  const chartDates = useMemo(() => {
    const dates = new Set(uniqueDates);
    initialOpportunityEntries.forEach((entry) => {
      dates.add(entry.normalizedDate);
    });

    return sortDateKeys(Array.from(dates));
  }, [initialOpportunityEntries, uniqueDates]);

  const opportunityIds = useMemo(() => {
    const ids = new Set();

    opportunityRegister.forEach((row) => {
      if (row?.opportunity_id) {
        ids.add(row.opportunity_id);
      }
    });

    opportunityValues.forEach((row) => {
      if (row?.opportunity) {
        ids.add(row.opportunity);
      }
    });

    return Array.from(ids).sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true })
    );
  }, [opportunityRegister, opportunityValues]);

  const columnDefinitions = useMemo(() => {
    const baseColumns = [
      { key: "opportunity", label: "Opportunity" },
      { key: "date_of_opportunity_identified", label: "Date of Opportunity Identified" },
      { key: "initial_opportunity_value", label: "Initial Opportunity Value" }
    ];

    const dateColumns = uniqueDates.map((dateKey) => ({
      key: `opportunity_on_${dateKey}`,
      label: `Opportunity on ${formatDateForDisplay(dateKey) || dateKey}`,
      dateKey
    }));

    return [...baseColumns, ...dateColumns];
  }, [uniqueDates]);

  const tableRows = useMemo(() => {
    return opportunityIds.map((opportunityId) => {
      const details = opportunityDetailsMap.get(opportunityId) || {};
      const valuesForOpportunity = valuesByOpportunity.get(opportunityId) || {};

      const derivedInitialValue = deriveOpportunityValue(details);
      const initialValue =
        derivedInitialValue ||
        (details.opportunity_value !== null && details.opportunity_value !== undefined
          ? String(details.opportunity_value)
          : "");

      const values = {
        opportunity: opportunityId,
        date_of_opportunity_identified: details.date_of_identification || "",
        initial_opportunity_value: initialValue
      };

      const cells = {};
      uniqueDates.forEach((dateKey) => {
        const columnKey = `opportunity_on_${dateKey}`;
        const valueEntry = valuesForOpportunity[dateKey];
        values[columnKey] = valueEntry?.value || "";
        cells[columnKey] = valueEntry || null;
      });

      return {
        opportunityId,
        values,
        cells
      };
    });
  }, [opportunityDetailsMap, valuesByOpportunity, opportunityIds, uniqueDates]);

  const trendSeries = useMemo(() => {
    return opportunityIds
      .map((opportunityId) => {
        const valuesForOpportunity = valuesByOpportunity.get(opportunityId) || {};
        const details = opportunityDetailsMap.get(opportunityId) || {};
        const initialEntry = initialOpportunityById.get(opportunityId);

        const values = chartDates.map((dateKey) => {
          const entry = valuesForOpportunity[dateKey];
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

        const descriptor = details.opportunity_description
          ? ` - ${String(details.opportunity_description).slice(0, 40)}`
          : "";

        return {
          id: opportunityId,
          label: `Opportunity ${opportunityId}${descriptor}`,
          values
        };
      })
      .filter(Boolean);
  }, [
    chartDates,
    initialOpportunityById,
    opportunityDetailsMap,
    opportunityIds,
    valuesByOpportunity
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
    const rowsForSearch = tableRows.map((row) => ({ id: row.opportunityId, ...row.values }));

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
    setFormValues({ opportunity: "", date: "", opportunity_value: "" });
    setModalMode("add");
    setRowEditOpportunityId(null);
    setRowEditEntries([]);
    setIsModalOpen(true);
  };

  const openEditModal = (opportunityId) => {
    const values = valuesByOpportunity.get(opportunityId) || {};
    const entries = sortDateKeys(Object.keys(values)).map((dateKey) => {
      const entry = values[dateKey];
      return {
        rowId: entry?.rowId || null,
        date: normalizeDateInput(entry?.originalDate) || entry?.normalizedDate || "",
        opportunity_value:
          entry?.value === null || entry?.value === undefined || entry?.value === ""
            ? ""
            : String(entry.value)
      };
    });

    setFormValues({ opportunity: "", date: "", opportunity_value: "" });
    setRowEditOpportunityId(opportunityId);
    setRowEditEntries(entries);
    setModalMode("row-edit");
    setIsModalOpen(true);
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setFormValues({ opportunity: "", date: "", opportunity_value: "" });
    setRowEditOpportunityId(null);
    setRowEditEntries([]);
    setModalMode("add");
    setIsSubmitting(false);
  };

  const handleAddSubmit = async () => {
    const opportunityId = formValues.opportunity;
    const normalizedDate = normalizeDateInput(formValues.date);

    if (!opportunityId) {
      alert("Please select an opportunity before saving.");
      return;
    }

    if (!normalizedDate) {
      alert("Please provide a valid date.");
      return;
    }

    const opportunityDetails = opportunityDetailsMap.get(opportunityId) || {};
    const identifiedDate = normalizeDateInput(opportunityDetails.date_of_identification);

    if (identifiedDate && normalizedDate < identifiedDate) {
      alert("Review date cannot be before the opportunity identification date.");
      return;
    }

    const valuesForOpportunity = valuesByOpportunity.get(opportunityId) || {};
    const existing = valuesForOpportunity[normalizedDate];

    if (modalMode === "add" && existing) {
      alert("An entry already exists for this opportunity on the selected date.");
      return;
    }

    const opportunityValue = formValues.opportunity_value;

    if (!opportunityValue || !ALLOWED_OPPORTUNITY_VALUES.includes(opportunityValue)) {
      alert("Please select a valid opportunity value.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      opportunity: opportunityId,
      date: normalizedDate,
      opportunity_value: opportunityValue
    };

    try {
      await onAdd(payload);
      resetModal();
    } catch (error) {
      console.error("Failed to save opportunity value history", error);
      setIsSubmitting(false);
    }
  };

  const handleRowEditSubmit = async () => {
    if (!rowEditOpportunityId) {
      alert("No opportunity selected to edit.");
      return;
    }

    if (rowEditEntries.length === 0) {
      resetModal();
      return;
    }

    const normalizedEntries = [];
    const seenDates = new Set();
    const opportunityDetails = opportunityDetailsMap.get(rowEditOpportunityId) || {};
    const identifiedDate = normalizeDateInput(opportunityDetails.date_of_identification);

    for (const entry of rowEditEntries) {
      const normalizedDate = normalizeDateInput(entry.date);
      const opportunityValue = entry.opportunity_value;

      if (!entry.rowId) {
        continue;
      }

      if (!normalizedDate) {
        alert("Please provide a valid date for all opportunity entries.");
        return;
      }

      if (!opportunityValue || !ALLOWED_OPPORTUNITY_VALUES.includes(opportunityValue)) {
        alert("Please select a valid opportunity value for all entries.");
        return;
      }

      if (identifiedDate && normalizedDate < identifiedDate) {
        alert("Review dates cannot be before the opportunity identification date.");
        return;
      }

      if (seenDates.has(normalizedDate)) {
        alert("Each opportunity entry must have a unique date.");
        return;
      }

      seenDates.add(normalizedDate);
      normalizedEntries.push({
        rowId: entry.rowId,
        normalizedDate,
        opportunityValue
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
            opportunity: rowEditOpportunityId,
            date: entry.normalizedDate,
            opportunity_value: entry.opportunityValue
          })
        )
      );
      resetModal();
    } catch (error) {
      console.error("Failed to update opportunity value history", error);
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
    if (!window.confirm("Delete this opportunity value entry?")) {
      return;
    }

    try {
      await onDelete(rowId);
    } catch (error) {
      console.error("Failed to delete opportunity value entry", error);
    }
  };

  const selectedOpportunityDetailsForAdd = opportunityDetailsMap.get(formValues.opportunity) || {};
  const identifiedDateDisplay = formatDateForDisplay(
    selectedOpportunityDetailsForAdd.date_of_identification
  );
  const initialOpportunityValue =
    deriveOpportunityValue(selectedOpportunityDetailsForAdd) ||
    (selectedOpportunityDetailsForAdd.opportunity_value !== null &&
    selectedOpportunityDetailsForAdd.opportunity_value !== undefined
      ? String(selectedOpportunityDetailsForAdd.opportunity_value)
      : "");

  const rowEditOpportunityDetails = opportunityDetailsMap.get(rowEditOpportunityId) || {};
  const rowEditIdentifiedDateDisplay = formatDateForDisplay(
    rowEditOpportunityDetails.date_of_identification
  );
  const rowEditInitialOpportunityValue =
    deriveOpportunityValue(rowEditOpportunityDetails) ||
    (rowEditOpportunityDetails.opportunity_value !== null &&
    rowEditOpportunityDetails.opportunity_value !== undefined
      ? String(rowEditOpportunityDetails.opportunity_value)
      : "");

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const renderOpportunityValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return <span className="muted-text">-</span>;
    }

    const displayValue = String(value);
    const levelClass = getOpportunityValueClassName(
      displayValue,
      "opportunity-value-history-value--"
    );
    const badgeClassName = ["opportunity-value-history-value", levelClass].filter(Boolean).join(" ");

    return <span className={badgeClassName}>{displayValue}</span>;
  };

  return (
    <div className="opportunity-value-history-grid">
      <div className="opportunity-value-history-chart insight-card">
        <MultiLineTrendChart
          labels={chartDates}
          series={trendSeries}
          labelFormatter={(label) => formatDateForDisplay(label) || label}
          valueFormatter={(value) => value.toString()}
          emptyMessage="Add opportunity value history to visualize the trend"
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
            disabled={opportunityIds.length === 0}
            title={
              opportunityIds.length === 0
                ? "Add opportunities in the register first"
                : undefined
            }
          >
            <PlusCircle size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading opportunity value history...</div>
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
                      {opportunityIds.length === 0
                        ? "Add opportunities in the register to begin tracking value history."
                        : "No opportunity value history recorded yet."}
                    </div>
                  </td>
                </tr>
              ) : (
                tableRows.map((row) => (
                  <tr
                    key={row.opportunityId}
                    id={anchorPrefix ? `${anchorPrefix}-row-${row.opportunityId}` : undefined}
                    data-search-table={sectionContext?.itemId || undefined}
                    data-search-row={row.opportunityId}
                  >
                    <td data-label="Opportunity">{row.values.opportunity}</td>
                    <td data-label="Date of Opportunity Identified">
                      {formatDateForDisplay(row.values.date_of_opportunity_identified) ||
                        row.values.date_of_opportunity_identified ||
                        "-"}
                    </td>
                    <td data-label="Initial Opportunity Value">
                      {renderOpportunityValue(row.values.initial_opportunity_value)}
                    </td>
                    {uniqueDates.map((dateKey) => {
                      const columnKey = `opportunity_on_${dateKey}`;
                      const cell = row.cells[columnKey];
                      const label = `Opportunity on ${formatDateForDisplay(dateKey) || dateKey}`;
                      return (
                        <td key={columnKey} data-label={label}>
                          {cell ? (
                            <div className="opportunity-value-history-cell">
                              {renderOpportunityValue(cell.value)}
                              {isEditor && (
                                <div className="opportunity-value-history-actions">
                                  <button
                                    className="btn btn-danger btn-icon"
                                    onClick={() => handleDelete(cell.rowId)}
                                    aria-label={`Delete opportunity value for ${row.opportunityId} on ${label}`}
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
                          onClick={() => openEditModal(row.opportunityId)}
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
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === "row-edit" ? "Edit Opportunity Value" : "Add Opportunity Value"}
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
                  <label className="label">Opportunity</label>
                  <div className="opportunity-value-history-meta">
                    {rowEditOpportunityId || "Not available"}
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">Date of Opportunity Identified</label>
                  <div className="opportunity-value-history-meta">
                    {rowEditIdentifiedDateDisplay ||
                      rowEditOpportunityDetails.date_of_identification ||
                      "Not available"}
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">Initial Opportunity Value</label>
                  <div className="opportunity-value-history-meta">
                    {rowEditInitialOpportunityValue
                      ? renderOpportunityValue(rowEditInitialOpportunityValue)
                      : "Not available"}
                  </div>
                </div>

                <div className="form-divider" style={{ margin: "1.5rem 0" }} />

                {rowEditEntries.length === 0 ? (
                  <div className="empty-state" style={{ marginBottom: "1.5rem" }}>
                    No opportunity value history entries recorded for this opportunity yet.
                  </div>
                ) : (
                  <div className="table-container" style={{ marginBottom: "1.5rem" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th scope="col">Review Date</th>
                          <th scope="col">Opportunity Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowEditEntries.map((entry, index) => (
                          <tr key={entry.rowId || entry.date || index}>
                            <td data-label="Review Date">
                              {formatDateForDisplay(entry.date) || entry.date || "-"}
                            </td>
                            <td data-label="Opportunity Value">
                              <select
                                id={`opportunity-edit-value-${index}`}
                                className="input"
                                value={entry.opportunity_value}
                                onChange={(event) =>
                                  updateRowEditEntry(index, {
                                    opportunity_value: event.target.value
                                  })
                                }
                                required
                              >
                                <option value="" disabled>
                                  Select opportunity value
                                </option>
                                {ALLOWED_OPPORTUNITY_VALUES.map((option) => (
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
                  <label className="label" htmlFor="opportunity-select">
                    Opportunity
                  </label>
                  <select
                    id="opportunity-select"
                    className="input"
                    value={formValues.opportunity}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        opportunity: event.target.value
                      }))
                    }
                    required
                  >
                    <option value="" disabled>
                      Select opportunity ID
                    </option>
                    {opportunityIds.map((opportunityId) => (
                      <option key={opportunityId} value={opportunityId}>
                        {opportunityId}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label" htmlFor="opportunity-date">
                    Date
                  </label>
                  <input
                    id="opportunity-date"
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
                  <label className="label" htmlFor="opportunity-value">
                    Opportunity Value
                  </label>
                  <select
                    id="opportunity-value"
                    className="input"
                    value={formValues.opportunity_value}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        opportunity_value: event.target.value
                      }))
                    }
                    required
                  >
                    <option value="" disabled>
                      Select opportunity value
                    </option>
                    {ALLOWED_OPPORTUNITY_VALUES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Date of Opportunity Identified</label>
                  <div className="opportunity-value-history-meta">
                    {identifiedDateDisplay ||
                      selectedOpportunityDetailsForAdd.date_of_identification ||
                      "Not available"}
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">Initial Opportunity Value</label>
                  <div className="opportunity-value-history-meta">
                    {initialOpportunityValue
                      ? renderOpportunityValue(initialOpportunityValue)
                      : "Not available"}
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

export default OpportunityValueHistoryTable;
