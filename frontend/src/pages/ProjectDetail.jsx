import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import { useGlobalSearch } from "../context/GlobalSearchContext";
import { usePlanCycle } from "../context/PlanCycleContext";
import "./Sidebar.css";
import M1RevisionHistory from "../components/sections/M1RevisionHistory";
import M2TOC from "../components/sections/M2TOC";
import M3Definitions from "../components/sections/M3Definitions";
import M4ProjectOverview from "../components/sections/M4ProjectOverview";
import M5Resources from "../components/sections/M5Resources";
import M6MonitoringControl from "../components/sections/M6MonitoringControl";
import M7QualityManagement from "../components/sections/M7QualityManagement";
import M8DecisionManagement from "../components/sections/M8DecisionManagement";
import M9RiskManagement from "../components/sections/M9RiskManagement";
import M10OpportunityManagement from "../components/sections/M10OpportunityManagement";
import M11ConfigurationManagement from "../components/sections/M11ConfigurationManagement";
import M12Deliverables from "../components/sections/M12Deliverables";
import M13SupplierAgreement from "../components/sections/M13SupplierAgreement";

const SECTION_DEFINITIONS = [
  { id: "M1", name: "Revision History", component: M1RevisionHistory },
  { id: "M2", name: "TOC", component: M2TOC },
  { id: "M3", name: "Definitions & References", component: M3Definitions },
  { id: "M4", name: "Project Introduction", component: M4ProjectOverview },
  { id: "M5", name: "Resource Plan & Estimation", component: M5Resources },
  { id: "M6", name: "PMC & Project Objectives", component: M6MonitoringControl },
  { id: "M7", name: "Quality Management", component: M7QualityManagement },
  { id: "M8", name: "DAR, Tailoring and Release Plan", component: M8DecisionManagement },
  { id: "M9", name: "Risk Management", component: M9RiskManagement },
  { id: "M10", name: "Opportunity Management", component: M10OpportunityManagement },
  { id: "M11", name: "Configuration Management", component: M11ConfigurationManagement },
  { id: "M12", name: "List of Deliverables", component: M12Deliverables },
  { id: "M13", name: "Supplier Agreement", component: M13SupplierAgreement }
];

const SECTION_LOOKUP = SECTION_DEFINITIONS.reduce((accumulator, definition) => {
  accumulator[definition.id] = definition;
  return accumulator;
}, {});

const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 520;

const ProjectDetail = () => {
  const { planCycleId, projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("M1");
  const [singleEntryDirtySections, setSingleEntryDirtySections] = useState({});
  const [error, setError] = useState("");
  const [sectionOutlines, setSectionOutlines] = useState({});
  const [subsectionNavigators, setSubsectionNavigators] = useState({});
  const [expandedSections, setExpandedSections] = useState(() => new Set());
  const pendingSubsectionRef = useRef(null);
  const contentRef = useRef(null);
  const [sidebarSearchTerm, setSidebarSearchTerm] = useState("");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const lastKnownWidthRef = useRef(sidebarWidth);
  const [isProjectInfoExpanded, setIsProjectInfoExpanded] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isEditor = ["admin", "editor"].includes(currentUser.role);
  const { planCycle, setSelectedPlanCycle, clearPlanCycle } = usePlanCycle();
  const {
    searchTerm,
    registerSectionNavigator,
    registerSource,
    setSearchTerm
  } = useGlobalSearch();

  const sections = useMemo(() => SECTION_DEFINITIONS, []);
  const activeSection = SECTION_LOOKUP[activeTab];
  const ActiveSectionComponent = activeSection?.component;
  const projectPlanCycleId = project?.plan_cycle_id;

  const focusContent = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      if (contentRef.current) {
        contentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }, []);

  const fetchProject = useCallback(async () => {
    if (!planCycleId) {
      navigate("/plan-cycles", { replace: true });
      return;
    }

    try {
      const response = await axios.get(`${API}/projects/${projectId}`);
      setProject(response.data);
      if (response.data?.plan_cycle_id) {
        try {
          const planCycleResponse = await axios.get(
            `${API}/plan-cycles/${response.data.plan_cycle_id}`
          );
          if (!planCycle || planCycle.id !== planCycleResponse.data.id) {
            setSelectedPlanCycle(planCycleResponse.data);
          }
        } catch (planCycleError) {
          console.warn("Unable to load plan cycle details", planCycleError);
        }
      }
    } catch (err) {
      setError("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [planCycleId, planCycle?.id, projectId, navigate, setSelectedPlanCycle]);

  const handleBackToProjects = useCallback(() => {
    const targetPlanCycleId = planCycleId || projectPlanCycleId || planCycle?.id;
    if (targetPlanCycleId) {
      navigate(`/plan-cycles/${targetPlanCycleId}/projects`);
      return;
    }

    navigate("/plan-cycles");
  }, [navigate, planCycle?.id, planCycleId, projectPlanCycleId]);

  const handleBackToPlanCycles = useCallback(() => {
    clearPlanCycle();
    navigate("/plan-cycles");
  }, [clearPlanCycle, navigate]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleSectionOutlineChange = useCallback((sectionId, outlineState) => {
    if (!sectionId) {
      return;
    }

    const safeOutline = outlineState || { items: [], activeItemId: null };
    const nextItems = Array.isArray(safeOutline.items)
      ? safeOutline.items.filter(Boolean)
      : [];
    const nextActiveId = safeOutline.activeItemId || null;

    setSectionOutlines((previous) => {
      const current = previous[sectionId] || { items: [], activeItemId: null };
      const itemsMatch =
        current.items.length === nextItems.length &&
        current.items.every((item, index) => {
          const nextItem = nextItems[index];
          return (
            item?.id === nextItem?.id &&
            item?.label === nextItem?.label &&
            item?.type === nextItem?.type
          );
        });
      const activeMatch = current.activeItemId === nextActiveId;

      if (itemsMatch && activeMatch) {
        return previous;
      }

      const nextState = { ...previous };
      if (!nextItems.length) {
        delete nextState[sectionId];
      } else {
        nextState[sectionId] = { items: nextItems, activeItemId: nextActiveId };
      }

      return nextState;
    });
  }, []);

  const registerSubsectionNavigator = useCallback((sectionId, navigator) => {
    if (!sectionId) {
      return () => {};
    }

    if (typeof navigator !== "function") {
      setSubsectionNavigators((previous) => {
        if (!previous[sectionId]) {
          return previous;
        }
        const nextState = { ...previous };
        delete nextState[sectionId];
        return nextState;
      });
      return () => {};
    }

    setSubsectionNavigators((previous) => {
      if (previous[sectionId] === navigator) {
        return previous;
      }
      return { ...previous, [sectionId]: navigator };
    });

    return () => {
      setSubsectionNavigators((previous) => {
        if (previous[sectionId] !== navigator) {
          return previous;
        }
        const nextState = { ...previous };
        delete nextState[sectionId];
        return nextState;
      });
    };
  }, []);

  const ensureSectionExpanded = useCallback((sectionId) => {
    if (!sectionId) {
      return;
    }

    setExpandedSections((previous) => {
      if (previous.has(sectionId)) {
        return previous;
      }
      const next = new Set(previous);
      next.add(sectionId);
      return next;
    });
  }, []);

  const updateSingleEntryDirtyState = useCallback((sectionId, isDirty) => {
    if (!sectionId) return;
    setSingleEntryDirtySections((prev) => {
      if (prev[sectionId] === isDirty) {
        return prev;
      }

      return { ...prev, [sectionId]: isDirty };
    });
  }, []);

  const attemptTabChange = useCallback(
    (nextTab) => {
      if (!nextTab || nextTab === activeTab) {
        return true;
      }

      if (singleEntryDirtySections[activeTab]) {
        const confirmLeave = window.confirm(
          "You have unsaved single-entry changes in this section. Continue without saving?"
        );

        if (!confirmLeave) {
          return false;
        }
      }

      setActiveTab(nextTab);
      ensureSectionExpanded(nextTab);
      return true;
    },
    [activeTab, ensureSectionExpanded, singleEntryDirtySections]
  );

  const handleTabClick = useCallback(
    (nextTab) => {
      const didChange = attemptTabChange(nextTab);
      if (!didChange) {
        return;
      }

      focusContent();
    },
    [attemptTabChange, focusContent]
  );

  const handleSubsectionNavigate = useCallback(
    (sectionId, itemId) => {
      if (!sectionId || !itemId) {
        return;
      }

      const didChange = attemptTabChange(sectionId);
      if (!didChange) {
        return;
      }

      ensureSectionExpanded(sectionId);
      pendingSubsectionRef.current = { sectionId, itemId };

      if (sectionId === activeTab) {
        const navigator = subsectionNavigators[sectionId];
        if (typeof navigator === "function") {
          navigator(itemId);
          pendingSubsectionRef.current = null;
        }
      }
    },
    [activeTab, attemptTabChange, ensureSectionExpanded, subsectionNavigators]
  );

  useEffect(() => {
    if (!pendingSubsectionRef.current) {
      return;
    }

    const { sectionId, itemId } = pendingSubsectionRef.current;
    if (sectionId !== activeTab) {
      return;
    }

    const navigator = subsectionNavigators[sectionId];
    if (typeof navigator !== "function") {
      return;
    }

    navigator(itemId);
    pendingSubsectionRef.current = null;
  }, [activeTab, subsectionNavigators]);

  const navigateWithinProject = useCallback(
    async (nextSectionId) => {
      if (!nextSectionId) {
        return;
      }

      pendingSubsectionRef.current = null;
      const didChange = attemptTabChange(nextSectionId);
      if (!didChange) {
        throw new Error("Navigation cancelled");
      }

      await new Promise((resolve) => setTimeout(resolve, 260));
      focusContent();
      ensureSectionExpanded(nextSectionId);
    },
    [attemptTabChange, ensureSectionExpanded, focusContent]
  );

  useEffect(() => {
    if (!registerSectionNavigator) {
      return undefined;
    }

    const unregister = registerSectionNavigator({ navigate: navigateWithinProject });
    return unregister;
  }, [registerSectionNavigator, navigateWithinProject]);

  useEffect(() => {
    if (!registerSource || !projectId) {
      return undefined;
    }

    const sourceId = `project-${projectId}-sections`;
    const getItems = () =>
      sections.map((section) => ({
        id: `${projectId}-${section.id}-section`,
        sectionId: section.id,
        sectionLabel: section.name,
        groupId: "project-sections",
        groupLabel: "Project Sections",
        type: "section",
        label: `${section.id}: ${section.name}`,
        description: `Jump to ${section.name}`,
        searchText: `${section.id} ${section.name}`.toLowerCase(),
        onNavigate: async () => {
          setSearchTerm("");
          await navigateWithinProject(section.id);
        }
      }));

    const unregister = registerSource({ id: sourceId, getItems });
    return unregister;
  }, [navigateWithinProject, projectId, registerSource, sections, setSearchTerm]);

  useEffect(() => {
    ensureSectionExpanded(activeTab);
  }, [activeTab, ensureSectionExpanded]);

  useEffect(() => {
    if (!isResizingSidebar) {
      return undefined;
    }

    const handleMouseMove = (event) => {
      const nextWidth = Math.min(
        Math.max(event.clientX, MIN_SIDEBAR_WIDTH),
        MAX_SIDEBAR_WIDTH
      );
      setSidebarWidth(nextWidth);
      lastKnownWidthRef.current = nextWidth;
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSidebar]);

  const handleSidebarToggle = useCallback(() => {
    setIsSidebarVisible((previous) => {
      if (previous) {
        lastKnownWidthRef.current = sidebarWidth;
        return false;
      }

      const restoredWidth = Math.min(
        Math.max(lastKnownWidthRef.current || sidebarWidth, MIN_SIDEBAR_WIDTH),
        MAX_SIDEBAR_WIDTH
      );
      setSidebarWidth(restoredWidth);
      return true;
    });
  }, [sidebarWidth]);

  const handleSidebarSearchChange = useCallback((event) => {
    setSidebarSearchTerm(event.target.value);
  }, []);

  const toggleSectionExpansion = useCallback((sectionId) => {
    if (!sectionId) {
      return;
    }

    setExpandedSections((previous) => {
      const next = new Set(previous);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const sidebarSearchValue = sidebarSearchTerm.trim().toLowerCase();

  if (loading) {
    return (
      <div className="project-detail-loading">
        <div className="loading">Loading project...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="project-detail-loading">
        <div className="error-message">{error || "Project not found"}</div>
        <div className="project-detail-error-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm project-detail-back"
            onClick={handleBackToProjects}
          >
            ← Back to Project List
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm project-detail-plan-cycles"
            onClick={handleBackToPlanCycles}
          >
            View Plan Cycles
          </button>
        </div>
      </div>
    );
  }

  const shellClassName = [
    "project-detail-shell",
    isSidebarVisible ? "sidebar-visible" : "sidebar-hidden",
    isResizingSidebar ? "sidebar-resizing" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const activeOutlineId = sectionOutlines[activeTab]?.activeItemId || null;

  return (
    <div className={shellClassName} style={{ "--project-sidebar-width": `${sidebarWidth}px` }}>
      <aside
        className={`project-detail-sidebar ${isSidebarVisible ? "is-visible" : "is-hidden"}`}
        style={{ width: isSidebarVisible ? `${sidebarWidth}px` : 0 }}
        aria-label="Project navigation"
      >
        <div className="project-detail-sidebar-header">
          <h2 className="project-detail-sidebar-title">Project Navigator</h2>
          <button
            type="button"
            className="project-detail-sidebar-hide"
            onClick={handleSidebarToggle}
            aria-label={isSidebarVisible ? "Hide navigation" : "Show navigation"}
          >
            ☰
          </button>
        </div>

        <div className="project-detail-sidebar-search">
          <label htmlFor="project-sidebar-search" className="sr-only">
            Search sections
          </label>
          <input
            id="project-sidebar-search"
            type="search"
            value={sidebarSearchTerm}
            onChange={handleSidebarSearchChange}
            placeholder="Search sections..."
            aria-label="Search sections"
          />
        </div>

        <nav className="project-detail-sidebar-nav" aria-label="Project sections">
          <ul className="project-detail-sidebar-sections">
            {sections.map((section, index) => {
              const outlineState = sectionOutlines[section.id];
              const outlineItems = outlineState?.items || [];
              const subsectionListId = `sidebar-outline-${section.id}`;

              const matchesSection = sidebarSearchValue
                ? section.name.toLowerCase().includes(sidebarSearchValue) ||
                  section.id.toLowerCase().includes(sidebarSearchValue)
                : true;

              const matchingSubsections = sidebarSearchValue
                ? outlineItems.filter((item) =>
                    item?.label?.toLowerCase().includes(sidebarSearchValue)
                  )
                : outlineItems;

              const shouldDisplay = matchesSection || matchingSubsections.length > 0;
              if (!shouldDisplay) {
                return null;
              }

              const isExpanded = sidebarSearchValue
                ? true
                : expandedSections.has(section.id) || section.id === activeTab;
              const hasSubsections = matchingSubsections.length > 0;

              return (
                <li key={section.id} className="project-detail-sidebar-item">
                  <div className="project-detail-sidebar-heading-row">
                    {outlineItems.length > 0 ? (
                      <button
                        type="button"
                        className="project-detail-sidebar-caret"
                        onClick={() => toggleSectionExpansion(section.id)}
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${section.name}`}
                        aria-expanded={isExpanded}
                        aria-controls={hasSubsections ? subsectionListId : undefined}
                      >
                        {isExpanded ? "▾" : "▸"}
                      </button>
                    ) : (
                      <span className="project-detail-sidebar-caret" aria-hidden="true">
                        •
                      </span>
                    )}
                    <button
                      type="button"
                      className={`project-detail-sidebar-link ${
                        section.id === activeTab ? "is-active" : ""
                      }`}
                      onClick={() => handleTabClick(section.id)}
                      aria-current={section.id === activeTab ? "true" : undefined}
                      title={`${section.id}: ${section.name}`}
                      data-testid={`tab-${section.id}`}
                    >
                      <span className="project-detail-sidebar-code" aria-hidden="true">
                        
                      </span>
                      <span className="project-detail-sidebar-label">{section.name}</span>
                      
                    </button>
                  </div>

                  {hasSubsections && isExpanded && (
                    <ul
                      id={subsectionListId}
                      className="project-detail-sidebar-subsections"
                      role="group"
                      aria-label={`${section.name} subsections`}
                    >
                      {matchingSubsections.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            className={`project-detail-sidebar-subsection ${
                              item.id === activeOutlineId ? "is-active" : ""
                            }`}
                            onClick={() => handleSubsectionNavigate(section.id, item.id)}
                          >
                            <span className="project-detail-sidebar-bullet" aria-hidden="true" />
                            <span className="project-detail-sidebar-subsection-label">
                              {item.label}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          className="project-detail-sidebar-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize navigation"
          onMouseDown={() => {
            if (!isSidebarVisible) {
              return;
            }
            setIsResizingSidebar(true);
          }}
        />
      </aside>

      <main
        className="project-detail-main"
        style={{ marginLeft: isSidebarVisible ? `${sidebarWidth}px` : "0px" }}
        ref={contentRef}
      >
        <div className="project-detail-main-header">
          <button
            type="button"
            className="project-detail-sidebar-toggle"
            onClick={handleSidebarToggle}
            aria-label={isSidebarVisible ? "Hide navigation" : "Show navigation"}
          >
            ☰
          </button>
          <div className="project-detail-heading">
            <div className="project-detail-heading-controls">
              <div className="project-detail-navigation-buttons">
                <button
                  type="button"
                  className="btn btn-outline btn-sm project-detail-back"
                  data-testid="back-to-projects"
                  onClick={handleBackToProjects}
                >
                  ← Back to Project List
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm project-detail-plan-cycles"
                  onClick={handleBackToPlanCycles}
                >
                  View Plan Cycles
                </button>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm project-detail-info-toggle"
                onClick={() => setIsProjectInfoExpanded((current) => !current)}
                aria-expanded={isProjectInfoExpanded}
                aria-controls="project-detail-info"
              >
                {isProjectInfoExpanded ? "Hide project info" : "Show project info"}
              </button>
            </div>
            <div
              id="project-detail-info"
              className={`project-detail-info ${
                isProjectInfoExpanded ? "is-expanded" : "is-collapsed"
              }`}
              aria-hidden={!isProjectInfoExpanded}
            >
              <h1 className="project-detail-title">Project Name : {project.name}</h1>
              {project.description && (
                <p className="project-detail-description">{project.description}</p>
              )}
            </div>
          </div>
          <div className="project-detail-role">
            <span className={`badge badge-${currentUser.role}`}>
              {currentUser.role} Mode
            </span>
          </div>
        </div>

        <div className="tabs-container project-detail-tabs">
          <div className="tab-content">
            <div className="tab-content-header">
              <h2 className="section-title" data-testid="section-heading">
                {activeSection?.name || "Section"}
              </h2>
              {searchTerm && (
                <p className="search-hint">
                  Filtering section content for <strong>"{searchTerm}"</strong>
                </p>
              )}
            </div>
            {ActiveSectionComponent && (
              <ActiveSectionComponent
                projectId={projectId}
                isEditor={isEditor}
                sectionId={activeTab}
                sectionName={activeSection?.name}
                onSingleEntryDirtyChange={updateSingleEntryDirtyState}
                onSectionOutlineChange={handleSectionOutlineChange}
                onRegisterSubsectionNavigator={registerSubsectionNavigator}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectDetail;
