import React, { createContext, useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useGlobalSearch } from "../context/GlobalSearchContext";

export const SectionItemContext = createContext(null);

const SectionLayout = ({
  title,
  projectId,
  sectionId,
  sectionLabel,
  items = [],
  defaultItemId,
  onOutlineChange,
  onRegisterNavigator,
  children
}) => {
  const { navigateToSection } = useGlobalSearch();
  const validItems = useMemo(
    () => items.filter((item) => item && item.id && typeof item.render === "function"),
    [items]
  );
  const resolvedSectionLabel = sectionLabel || title || "Section";
  const computedDefaultId = useMemo(() => {
    if (defaultItemId && validItems.some((item) => item.id === defaultItemId)) {
      return defaultItemId;
    }
    return validItems[0]?.id || null;
  }, [defaultItemId, validItems]);

  const [activeId, setActiveId] = useState(computedDefaultId);
  const itemRefs = useRef({});

  useEffect(() => {
    setActiveId((current) => {
      if (current && validItems.some((item) => item.id === current)) {
        return current;
      }
      return computedDefaultId;
    });
  }, [computedDefaultId, validItems]);

  const scrollToItem = useCallback(
    (itemId) => {
      if (!itemId) {
        return;
      }

      setActiveId(itemId);
      const node = itemRefs.current[itemId];
      if (node && typeof node.scrollIntoView === "function") {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => {
            const aIndex = Number(a.target.getAttribute("data-index") || 0);
            const bIndex = Number(b.target.getAttribute("data-index") || 0);
            return aIndex - bIndex;
          })[0];

        if (visibleEntry) {
          const nextId = visibleEntry.target.getAttribute("data-item-id");
          if (nextId) {
            setActiveId((current) => (current === nextId ? current : nextId));
          }
        }
      },
      {
        root: null,
        rootMargin: "-30% 0px -50% 0px",
        threshold: [0.1, 0.25, 0.5]
      }
    );

    validItems.forEach((item) => {
      const node = itemRefs.current[item.id];
      if (node) {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, [validItems]);

  const outlineItems = useMemo(
    () =>
      validItems.map((item) => ({
        id: item.id,
        label: item.label,
        type: item.type || "item"
      })),
    [validItems]
  );

  useEffect(() => {
    if (!onOutlineChange || !sectionId) {
      return undefined;
    }

    onOutlineChange(sectionId, { items: outlineItems, activeItemId: activeId });
    return () => {
      onOutlineChange(sectionId, { items: [], activeItemId: null });
    };
  }, [activeId, onOutlineChange, outlineItems, sectionId]);

  useEffect(() => {
    if (!onRegisterNavigator || !sectionId) {
      return undefined;
    }

    return onRegisterNavigator(sectionId, (itemId) => {
      scrollToItem(itemId);
    });
  }, [onRegisterNavigator, scrollToItem, sectionId]);

  return (
    <div className="section-shell no-sidebar">
      <div className="section-shell__header">
      </div>
      <div className="section-shell__content">
        {validItems.length ? (
          <div className="section-shell__content-inner">
            {validItems.map((item, index) => {
              const shouldRenderHeading = Boolean(item.heading);
              const contextValue = {
                projectId,
                sectionId,
                sectionLabel: resolvedSectionLabel,
                itemId: item.id,
                itemLabel: item.label,
                itemType: item.type,
                navigateToSection
              };

              return (
                <section
                  key={item.id}
                  id={`section-${item.id}`}
                  ref={(node) => {
                    if (node) {
                      itemRefs.current[item.id] = node;
                    } else {
                      delete itemRefs.current[item.id];
                    }
                  }}
                  data-item-id={item.id}
                  data-index={index}
                  className="section-shell__content-section"
                >
                  {shouldRenderHeading ? (
                    <h3 className="section-shell__content-heading">{item.label}</h3>
                  ) : null}
                  <SectionItemContext.Provider value={contextValue}>
                    <div className="section-shell__content-body">{item.render()}</div>
                  </SectionItemContext.Provider>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="section-shell__empty">No content available for this section.</div>
        )}
      </div>
      {children}
    </div>
  );
};

export default SectionLayout;
