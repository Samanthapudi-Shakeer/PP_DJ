import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";

const PlanCycleContext = createContext(undefined);

const STORAGE_KEY = "planCycle";

export const PlanCycleProvider = ({ children }) => {
  const [planCycle, setPlanCycle] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Failed to parse stored plan cycle", error);
      return null;
    }
  });

  const persistPlanCycle = useCallback((value) => {
    if (typeof window === "undefined") {
      return;
    }

    if (value) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setSelectedPlanCycle = useCallback(
    (nextPlanCycle) => {
      setPlanCycle((previous) => {
        const resolved =
          typeof nextPlanCycle === "function"
            ? nextPlanCycle(previous)
            : nextPlanCycle;
        const normalized = resolved ?? null;

        if (previous === normalized) {
          return previous;
        }

        persistPlanCycle(normalized);
        return normalized;
      });
    },
    [persistPlanCycle]
  );

  const clearPlanCycle = useCallback(() => {
    setSelectedPlanCycle(null);
  }, [setSelectedPlanCycle]);

  const value = useMemo(
    () => ({
      planCycle,
      planCycleId: planCycle?.id || null,
      setSelectedPlanCycle,
      clearPlanCycle
    }),
    [planCycle, clearPlanCycle, setSelectedPlanCycle]
  );

  return (
    <PlanCycleContext.Provider value={value}>
      {children}
    </PlanCycleContext.Provider>
  );
};

export const usePlanCycle = () => {
  const context = useContext(PlanCycleContext);
  if (!context) {
    throw new Error("usePlanCycle must be used within a PlanCycleProvider");
  }
  return context;
};

