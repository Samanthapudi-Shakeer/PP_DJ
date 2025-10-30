import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { SectionItemContext } from "./SectionLayout";
import { SectionCardActionsContext } from "./SectionCard";
import { useGlobalSearch } from "../context/GlobalSearchContext";
import { buildSingleEntrySearchItems } from "../utils/searchRegistry";
import clsx from "clsx";
import AutoResizingTextarea from "./ui/AutoResizingTextarea";

const ExternalActionRegistrar = ({ action, register }) => {
  useEffect(() => {
    if (!register) {
      return undefined;
    }

    return register(action);
  }, [action, register]);

  return null;
};

const SingleEntryEditor = ({
  definitions = [],
  values = {},
  loading = false,
  isEditor = false,
  onContentChange,
  onImageChange,
  onSave,
  dirtyFields = {},
  variant = "standalone",
  showFieldHeading
}) => {
  const sectionContext = useContext(SectionItemContext);
  const sectionCardContext = useContext(SectionCardActionsContext);
  const [editingFields, setEditingFields] = useState({});
  const { registerSource, navigateToSection } = useGlobalSearch();
  const anchorPrefix = useMemo(() => {
    if (!sectionContext?.projectId || !sectionContext?.sectionId || !sectionContext?.itemId) {
      return null;
    }

    return `single-entry-${sectionContext.projectId}-${sectionContext.sectionId}-${sectionContext.itemId}`;
  }, [sectionContext?.projectId, sectionContext?.sectionId, sectionContext?.itemId]);

  useEffect(() => {
    if (!registerSource || !sectionContext?.projectId || !sectionContext?.sectionId || !sectionContext?.itemId) {
      return undefined;
    }

    const sourceId = `${sectionContext.projectId}-${sectionContext.sectionId}-${sectionContext.itemId}-single-entry`;

    const unregister = registerSource({
      id: sourceId,
      getItems: () =>
        buildSingleEntrySearchItems({
          projectId: sectionContext.projectId,
          sectionId: sectionContext.sectionId,
          sectionLabel: sectionContext.sectionLabel,
          groupId: sectionContext.itemId,
          groupLabel: sectionContext.itemLabel,
          entries: definitions,
          values,
          navigateToSection,
          anchorPrefix
        })
    });

    return unregister;
  }, [
    registerSource,
    sectionContext?.projectId,
    sectionContext?.sectionId,
    sectionContext?.itemId,
    sectionContext?.itemLabel,
    sectionContext?.sectionLabel,
    definitions,
    values,
    navigateToSection,
    anchorPrefix
  ]);

  const startEditing = useCallback((field, originalContent) => {
    setEditingFields((previous) => ({
      ...previous,
      [field]: {
        isEditing: true,
        originalContent
      }
    }));
  }, []);

  const stopEditing = useCallback((field) => {
    setEditingFields((previous) => {
      if (!previous[field]) {
        return previous;
      }

      const next = { ...previous };
      delete next[field];
      return next;
    });
  }, []);

  const cancelEditing = useCallback(
    (field) => {
      const fieldState = editingFields[field];
      stopEditing(field);

      if (!fieldState) {
        return;
      }

      const originalValue =
        typeof fieldState.originalContent === "string"
          ? fieldState.originalContent
          : fieldState.originalContent ?? "";
      const currentValue = values[field]?.content ?? "";

      if (onContentChange && currentValue !== originalValue) {
        onContentChange(field, originalValue);
      }
    },
    [editingFields, onContentChange, stopEditing, values]
  );

  const handleSave = useCallback(
    async (field) => {
      if (!onSave) {
        stopEditing(field);
        return;
      }

      try {
        const result = onSave(field);

        if (result && typeof result.then === "function") {
          await result;
        }

        stopEditing(field);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    },
    [onSave, stopEditing]
  );

  const isEmbedded = variant === "embedded";
  const shouldShowFieldHeading =
    typeof showFieldHeading === "boolean" ? showFieldHeading : !isEmbedded;
  const hasExternalActionSlot = useMemo(() => {
    return Boolean(sectionCardContext?.registerActions) && isEmbedded && definitions.length === 1;
  }, [definitions.length, isEmbedded, sectionCardContext?.registerActions]);

  if (!definitions.length) {
    return null;
  }

  return (
    <div className="single-entry-editor-grid">
      {definitions.map((entry) => {
        const value = values[entry.field] || { content: "", image_data: null };
        const rawContent = value.content ?? "";
        const contentText =
          typeof rawContent === "string" ? rawContent : String(rawContent ?? "");
        const hasContent =
          typeof rawContent === "string"
            ? rawContent.trim().length > 0
            : rawContent !== null && rawContent !== undefined;
        const containerId = anchorPrefix ? `${anchorPrefix}-${entry.field}` : undefined;

        const fieldState = editingFields[entry.field];
        const isEditing = Boolean(fieldState?.isEditing);

        if (!isEditor) {
          return (
            <div
              className={clsx("single-entry-viewer", {
                "single-entry-viewer--flush": isEmbedded
              })}
              key={entry.field}
              id={containerId}
            >
              {shouldShowFieldHeading ? (
                <h3 className="single-entry-viewer-heading">{entry.label}</h3>
              ) : null}
              <p
                className={clsx(`single-entry-viewer-content${hasContent ? "" : " is-empty"}`, {
                  "single-entry-viewer-content--flush": isEmbedded
                })}
              >
                {hasContent
                  ? contentText
                  : `No ${entry.label.toLowerCase()} provided yet.`}
              </p>
              {value.image_data ? (
                <img
                  className="single-entry-viewer-image"
                  src={value.image_data}
                  alt={`${entry.label} visual`}
                />
              ) : null}
            </div>
          );
        }

        const shouldShowAddPlaceholder = !hasContent;
        const inlineDirtyState = dirtyFields[entry.field];
        const shouldRegisterExternalAction =
          hasExternalActionSlot && typeof sectionCardContext?.registerActions === "function";
        const headerAction =
          !isEditor || isEditing
            ? null
            : (
                <button
                  className="btn btn-outline btn-icon single-entry-card-action"
                  onClick={() => startEditing(entry.field, contentText)}
                  disabled={loading}
                  type="button"
                  aria-label={`${shouldShowAddPlaceholder ? "Add" : "Edit"} ${entry.label}`}
                  title={`${shouldShowAddPlaceholder ? "Add" : "Edit"} ${entry.label}`}
                >
                  {shouldShowAddPlaceholder ? (
                    <Plus size={18} aria-hidden="true" />
                  ) : (
                    <Pencil size={18} aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {shouldShowAddPlaceholder ? "Add" : "Edit"} {entry.label}
                  </span>
                </button>
              );

        return (
          <div
            className={clsx("single-entry-card", {
              "single-entry-card--flush": isEmbedded
            })}
            key={entry.field}
            id={containerId}
          >
            {shouldShowFieldHeading || !shouldRegisterExternalAction ? (
              <div
                className={clsx("single-entry-card-header", {
                  "single-entry-card-header--compact": !shouldShowFieldHeading
                })}
              >
                {shouldShowFieldHeading ? (
                  <div className="single-entry-card-header__text">
                    <h3 className="single-entry-card-title">{entry.label}</h3>
                    {entry.description && (
                      <p className="single-entry-card-description">{entry.description}</p>
                    )}
                  </div>
                ) : null}
                {!shouldRegisterExternalAction ? headerAction : null}
              </div>
            ) : null}
            {shouldRegisterExternalAction ? (
              <ExternalActionRegistrar
                action={headerAction}
                register={sectionCardContext?.registerActions}
              />
            ) : null}
            {isEditing ? (
              <>
                <AutoResizingTextarea
                  className="input single-entry-textarea"
                  minRows={entry.rows || 4}
                  maxRows={entry.maxRows || 12}
                  value={contentText}
                  onChange={(event) => onContentChange?.(entry.field, event.target.value)}
                  readOnly={!isEditing}
                  disabled={loading}
                  placeholder={`Enter ${entry.label.toLowerCase()}...`}
                  data-search-field={entry.field}
                />
                {entry.supportsImage && (
                  <div className="single-entry-image-field">
                    <label className="label" style={{ display: "block", marginBottom: "0.5rem" }}>
                      Attach Diagram / Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (event) => {
                        const file = event.target.files?.[0] || null;
                        await onImageChange?.(entry.field, file);
                      }}
                      disabled={loading}
                    />
                    {value.image_data && (
                      <div style={{ marginTop: "0.75rem" }}>
                        <img
                          src={value.image_data}
                          alt={`${entry.label} visual`}
                          style={{ maxWidth: "100%", borderRadius: "0.5rem" }}
                        />
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ marginTop: "0.75rem" }}
                          onClick={() => onImageChange?.(entry.field, null)}
                          type="button"
                        >
                          Remove Image
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="single-entry-editor-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSave(entry.field)}
                    disabled={loading || !inlineDirtyState}
                    type="button"
                  >
                    Save
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => cancelEditing(entry.field)}
                    disabled={loading}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p
                  className={clsx(`single-entry-viewer-content${hasContent ? "" : " is-empty"}`, {
                    "single-entry-viewer-content--flush": isEmbedded
                  })}
                >
                  {hasContent
                    ? contentText
                    : `Add ${entry.label.toLowerCase()} to provide more context.`}
                </p>
                {value.image_data ? (
                  <img
                    className="single-entry-viewer-image"
                    src={value.image_data}
                    alt={`${entry.label} visual`}
                  />
                ) : null}
              </>
            )}
            </div>
        );
      })}
    </div>
  );
};

export default SingleEntryEditor;
