import React, { useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import DataTable from "../DataTable";
import SingleEntryEditor from "../SingleEntryEditor";
import SectionCard from "../SectionCard";
import SectionLayout from "../SectionLayout";
import { useGenericTables } from "../../hooks/useGenericTables";
import { useSingleEntries } from "../../hooks/useSingleEntries";
import { SECTION_CONFIG } from "../../sectionConfig";

const SECTION_ID = "M7";

const M7QualityManagement = ({
  projectId,
  isEditor,
  sectionId,
  sectionName,
  onSingleEntryDirtyChange,
  onSectionOutlineChange,
  onRegisterSubsectionNavigator
}) => {
  const config = SECTION_CONFIG[SECTION_ID] || { tables: [], singleEntries: [] };
  const CAUSAL_ANALYSIS_TABLE_KEYS = {
    PROACTIVE: "proactive_causal_analysis_plan",
    REACTIVE: "reactive_causal_analysis_plan"
  };
  const {
    data: tableData,
    loading: tablesLoading,
    createRow,
    updateRow,
    deleteRow,
    refresh
  } = useGenericTables(projectId, SECTION_ID, config.tables || []);
  const {
    values: singleEntryValues,
    loading: singleEntryLoading,
    updateContent,
    updateImage,
    saveEntry,
    dirtyFields: singleEntryDirty,
    hasUnsavedChanges: singleEntryHasUnsaved
  } = useSingleEntries(projectId, config.singleEntries || []);

  useEffect(() => {
    if (onSingleEntryDirtyChange && sectionId) {
      onSingleEntryDirtyChange(sectionId, singleEntryHasUnsaved);
    }
  }, [onSingleEntryDirtyChange, sectionId, singleEntryHasUnsaved]);

  useEffect(() => {
    return () => {
      if (onSingleEntryDirtyChange && sectionId) {
        onSingleEntryDirtyChange(sectionId, false);
      }
    };
  }, [onSingleEntryDirtyChange, sectionId]);

  const handleAddRow = async (tableKey, payload) => {
    try {
      await createRow(tableKey, payload);
    } catch (error) {
      console.error("Failed to add row", error);
      alert("Failed to add row");
    }
  };

  const handleEditRow = async (tableKey, rowId, payload) => {
    const { id: _id, ...data } = payload;
    try {
      await updateRow(tableKey, rowId, data);
    } catch (error) {
      console.error("Failed to update row", error);
      alert("Failed to update row");
    }
  };

  const handleDeleteRow = async (tableKey, rowId) => {
    if (!window.confirm("Delete this row?")) return;
    try {
      await deleteRow(tableKey, rowId);
    } catch (error) {
      console.error("Failed to delete row", error);
      alert("Failed to delete row");
    }
  };

  const handlePrefillRows = async (table) => {
    if (!table.prefillRows || !table.prefillRows.length) return;
    const apiName = table.apiName || table.key;
    try {
      for (const row of table.prefillRows) {
        await axios.post(
          `${API}/projects/${projectId}/sections/${SECTION_ID}/tables/${apiName}`,
          { data: row }
        );
      }
      await refresh();
    } catch (error) {
      console.error("Failed to populate defaults", error);
      alert("Failed to populate defaults");
    }
  };

  const handleSingleEntrySave = async (field) => {
    try {
      await saveEntry(field);
      alert("Saved successfully!");
    } catch (error) {
      console.error("Failed to save entry", error);
      alert("Failed to save");
    }
  };

  const colors = {
    green: "#0f766e",
    purple: "#6b21a8"
  };

  const infoMessages = {
    standards: () => (
      <p style={{ margin: 0 }}>
        {"<"}Specify Technical standards, Quality Standards including coding guidelines
        followed in the project{">"}
      </p>
    ),
    verificationAndValidation: () => (
      <div style={{ color: colors.green }}>
        <p style={{ margin: "0 0 0.5rem 0" }}>
          {""}
          {"<"}As per ISO 21434 standard, Cyber Security related test are done using 1.Test
          Environment in office premises 2.Test at the actual vehicle level Mention the
          details accordingly.{">"}
        </p>
        <p style={{ margin: 0 }}>
          {"<"}As per ISO 26262 standard, verification statement along with evidence has to be
          provided for verification done at various level of product development testing
          phases{">"}
        </p>
      </div>
    ),
    confirmationReview: () => (
      <div style={{ color: colors.green }}>
        <p style={{ margin: "0 0 0.5rem 0" }}>
          {""}
        </p>
        <p style={{ margin: "0 0 0.5rem 0" }}>
          Note1:
          <br />
          I0: The confirmation measure should be performed; however, if the confirmation
          measure is performed, it shall be performed by a different person in relation to
          the person(s) responsible for the creation of the considered work product(s)
          <br />
          I1: The confirmation measure shall be performed, by a different person in relation
          to the person(s) responsible for the creation of the considered work product(s)
          <br />
          I2: The confirmation measure shall be performed, by a person who is independent
          from the team that is responsible for the creation of the considered work
          product(s), i.e. by a person not reporting to the same direct superior
          <br />
          I3: The confirmation measure shall be performed by a person who is independent,
          regarding management, resources and release authority, from the department
          responsible for the creation of the considered work product(s)
        </p>
        <p style={{ margin: 0 }}>
          Note2: Refer GL_AU_04_Project_Safety_Management_Guideline.docx to identify the
          artifacts which are applicable for confirmation review.
        </p>
      </div>
    ),
    supplierEvaluationCapability: () => (
      <div style={{ color: colors.purple }}>
        <p style={{ margin: "0 0 0.5rem 0" }}>
          {""}
        </p>
        <p style={{ margin: "0 0 0.5rem 0" }}>
          {"<"}The capability of the considered supplier shall be evaluated, the evaluation
          supports supplier selection and can be based on the supplier’s capability to comply
          with ISO 21434, or on an evaluation of the previous implementation of another
          national or international cybersecurity standard{">"}
        </p>
        <p style={{ margin: 0 }}>
          If any supplier is involved in any development, testing or any activity in the
          ongoing project, Supplier selection form is separately created and needs to be
          filled for evaluation.
        </p>
      </div>
    ),
    cybersecurityAssessment: () => (
      <div style={{ color: colors.green }}>
        <p style={{ margin: "0 0 0.5rem 0" }}>
          {""}
        </p>
        <p style={{ margin: "0 0 0.5rem 0" }}>
          {"<"}The cybersecurity assessment shall judge whether the available evidence
          provides confidence that the achieved degree of cybersecurity of the item or
          component is sufficient. The available evidence is provided by the documented
          results of the cybersecurity activities (i.e., the work products). The cybersecurity
          assessment report shall be made available prior to the release for post-development.
          Use the Cyber Security Assessment template in QMS and make use of the guideline and
          practice in the template.{">"}
        </p>
        <p style={{ margin: 0 }}>
          {"<"}The Same report can be used for Post development assessment, The release for
          post-development of the item or component shall be approved if both of the
          following conditions are fulfilled: a) sufficient evidence of the achieved degree of
          cybersecurity is provided by the cybersecurity case; and if applicable the judgement
          included in the cybersecurity assessment report; and b) the cybersecurity
          requirements for the post-development phase are identified and reviewed{">"}
        </p>
      </div>
    )
  };

  const getInfoText = (key) => (infoMessages[key] ? infoMessages[key]() : null);

  const renderTableCard = (table) => {
    if (!table) {
      return { content: null, actions: null };
    }

    if (tablesLoading) {
      return { content: <div className="loading">Loading tables...</div>, actions: null };
    }

    const shouldShowPrefill =
      isEditor && (tableData[table.key] || []).length === 0 && table.prefillRows;

    const actions = shouldShowPrefill ? (
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => handlePrefillRows(table)}
        type="button"
      >
        Populate Defaults
      </button>
    ) : null;

    const content = (
      <DataTable
        columns={table.columns}
        data={tableData[table.key] || []}
        onAdd={(newRow) => handleAddRow(table.key, newRow)}
        onEdit={(rowId, updated) => handleEditRow(table.key, rowId, updated)}
        onDelete={(rowId) => handleDeleteRow(table.key, rowId)}
        isEditor={isEditor}
        addButtonText={table.addButtonText || `Add in ${table.title || table.name || table.key}`}
        uniqueKeys={table.uniqueFields || []}
        preventDuplicateRows={Boolean(table.preventDuplicateRows)}
      />
    );

    return { content, actions };
  };

  const findTable = (key) => (config.tables || []).find((table) => table.key === key);
  const findSingleEntry = (field) =>
    (config.singleEntries || []).find((entry) => entry.field === field);

  const buildTableItem = ({ table: providedTable, tableKey, label, infoKey, headingColor }) => {
    const table = providedTable || (tableKey ? findTable(tableKey) : null);

    if (!table) {
      return null;
    }

    const { content, actions } = renderTableCard(table);

    return {
      id: `table-${table.key}`,
      label,
      type: "Table",
      heading: false,
      render: () => (
        <SectionCard
          title={label}
          infoText={getInfoText(infoKey)}
          headingProps={headingColor ? { style: { color: headingColor } } : undefined}
          actions={actions}
        >
          {content}
        </SectionCard>
      )
    };
  };

  const buildTableItemByKey = ({ tableKey, label, infoKey, headingColor }) =>
    buildTableItem({ tableKey, label, infoKey, headingColor });

  const buildCausalAnalysisItem = () => {
    const proactiveTable = findTable(CAUSAL_ANALYSIS_TABLE_KEYS.PROACTIVE);
    const reactiveTable = findTable(CAUSAL_ANALYSIS_TABLE_KEYS.REACTIVE);

    if (!proactiveTable && !reactiveTable) {
      return null;
    }

    const subsections = [
      {
        table: proactiveTable,
        title: "(a) Experience Based (Pro-active Causal Analysis Plan)",
        description:
          "Complete this section based on previous project experience or organization risk database"
      },
      {
        table: reactiveTable,
        title: "(b) During Project Execution (Reactive Causal Analysis Plan)",
        description:
          "List phases/activities where results of analysis requires root cause identification during project execution ex. In code reviews point exceeding upper control limit in u-chart, multiple defects from same category in testing"
      }
    ];

    return {
      id: "table-causal-analysis-plan",
      label: "Causal Analysis Plan",
      type: "Table",
      heading: false,
      render: () => (
        <SectionCard title="Causal Analysis Plan">
          {subsections
            .filter((section) => section.table)
            .map((section) => {
              const { content, actions } = renderTableCard(section.table);

              return (
                <div key={section.table.key} className="section-card-subgroup">
                  {actions ? (
                    <div className="section-card-inline-actions">{actions}</div>
                  ) : null}
                  <div className="section-card-subgroup-header">
                    <h4 className="section-card-subtitle">{section.title}</h4>
                    <p className="section-card-description">{section.description}</p>
                  </div>
                  {content}
                </div>
              );
            })}
        </SectionCard>
      )
    };
  };

  const buildSingleEntryItem = ({ entry, label, infoKey, headingColor }) => {
    if (!entry) {
      return null;
    }

    return {
      id: `single-${entry.field}`,
      label,
      type: "Single Entry",
      heading: false,
      render: () => (
        <SectionCard
          title={label}
          infoText={getInfoText(infoKey)}
          headingProps={headingColor ? { style: { color: headingColor } } : undefined}
        >
          <SingleEntryEditor
            key={entry.field}
            definitions={[entry]}
            values={singleEntryValues}
            loading={singleEntryLoading}
            isEditor={isEditor}
            onContentChange={updateContent}
            onImageChange={updateImage}
            onSave={handleSingleEntrySave}
            dirtyFields={{ [entry.field]: singleEntryDirty[entry.field] }}
            variant="embedded"
          />
        </SectionCard>
      )
    };
  };

  const navigationItems = [
    buildTableItemByKey({
      tableKey: "standards_qm",
      label: "Standards",
      infoKey: "standards"
    }),
    buildTableItemByKey({
      tableKey: "verification_and_validation_plan",
      label: "Verification and Validation Plan",
      infoKey: "verificationAndValidation"
    }),
    buildTableItemByKey({
      tableKey: "confirmation_review_plan",
      label: "Confirmation Review Plan",
      infoKey: "confirmationReview",
      headingColor: colors.green
    }),
    buildCausalAnalysisItem(),
    buildSingleEntryItem({
      entry: findSingleEntry("supplier_evaluation_capability"),
      label: "Supplier Evaluation Capability",
      infoKey: "supplierEvaluationCapability",
      headingColor: colors.purple
    }),
    buildSingleEntryItem({
      entry: findSingleEntry("cyber_security_assessment_and_release"),
      label: "Cybersecurity Assessment and Release",
      infoKey: "cybersecurityAssessment",
      headingColor: colors.green
    })
  ].filter(Boolean);

  if (!navigationItems.length) {
    navigationItems.push({
      id: "info-empty",
      label: "Quality Guidance",
      type: "Info",
      render: () => <div className="info-message">No quality data configured for this section.</div>
    });
  }

  return (
    <SectionLayout
      title="M7 - Quality Management"
      sectionId={sectionId}
      sectionLabel={sectionName}
      projectId={projectId}
      items={navigationItems}
      onOutlineChange={onSectionOutlineChange}
      onRegisterNavigator={onRegisterSubsectionNavigator}
    />
  );
};

export default M7QualityManagement;
