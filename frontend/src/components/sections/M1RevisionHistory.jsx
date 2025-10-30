import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import DataTable from "../DataTable";
import SectionCard from "../SectionCard";
import SectionLayout from "../SectionLayout";

const M1RevisionHistory = ({
  projectId,
  isEditor,
  sectionId,
  sectionName,
  onSectionOutlineChange,
  onRegisterSubsectionNavigator
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const formatDateValue = (value) => {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toISOString().slice(0, 10);
  };

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API}/projects/${projectId}/revision-history`);
      const formattedRows = Array.isArray(response.data)
        ? response.data.map((row) => ({
            ...row,
            date: formatDateValue(row?.date) || row?.date || ""
          }))
        : [];
      setData(formattedRows);
    } catch (err) {
      console.error("Failed to fetch revision history", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (newData) => {
    try {
      await axios.post(`${API}/projects/${projectId}/revision-history`, newData);
      fetchData();
    } catch (err) {
      alert("Failed to add row");
    }
  };

  const handleEdit = async (id, updatedData) => {
    try {
      const { id: _, project_id, ...dataToSend } = updatedData;
      await axios.put(`${API}/projects/${projectId}/revision-history/${id}`, dataToSend);
      fetchData();
    } catch (err) {
      alert("Failed to update row");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this row?")) return;
    try {
      await axios.delete(`${API}/projects/${projectId}/revision-history/${id}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete row");
    }
  };

  const columns = [
    { key: "revision_no", label: "Revision No", decimalOnly: true },
    { key: "date", label: "Date YYYY-MM-DD", inputType: "date" },
    { key: "change_description", label: "Change Description" },
    { key: "authors", label: "Author(s)" },
    { key: "reviewed_by", label: "Reviewed By" },
    { key: "approved_by", label: "Approved By" }
  ];

  const navigationItems = [
    {
      id: "table-revision-history",
      label: "Revision History",
      type: "Table",
      heading: false,
      render: () => (
        loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <SectionCard
            title="Revision History"
            infoText="Track every revision recorded for this project plan."
          >
            <DataTable
              columns={columns}
              data={data}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isEditor={isEditor}
              addButtonText="Add in Revision History"
              uniqueKeys={["revision_no"]}
              fillEmptyWithDashOnAdd
            />
          </SectionCard>
        )
      )
    }
  ];

  return (
    <SectionLayout
      title="Document History"
      sectionId={sectionId}
      sectionLabel={sectionName}
      projectId={projectId}
      items={navigationItems}
      onOutlineChange={onSectionOutlineChange}
      onRegisterNavigator={onRegisterSubsectionNavigator}
    />
  );
};

export default M1RevisionHistory;
