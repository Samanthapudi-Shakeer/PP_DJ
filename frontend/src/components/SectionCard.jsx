import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import clsx from "clsx";
import SectionHeading from "./SectionHeading";

export const SectionCardActionsContext = createContext(null);

const SectionCard = ({
  title,
  infoText,
  headingProps,
  actions,
  children,
  className,
  bodyClassName
}) => {
  const [registeredActions, setRegisteredActions] = useState(actions || null);
  const propActionsRef = useRef(actions || null);

  useEffect(() => {
    const nextActions = actions || null;
    propActionsRef.current = nextActions;
    setRegisteredActions(nextActions);
  }, [actions]);

  const registerActions = useCallback(
    (nextActions) => {
      setRegisteredActions(nextActions || null);

      return () => {
        setRegisteredActions(propActionsRef.current);
      };
    },
    []
  );

  const contextValue = useMemo(
    () => ({
      registerActions
    }),
    [registerActions]
  );

  return (
    <SectionCardActionsContext.Provider value={contextValue}>
      <div className={clsx("card section-card", className)}>
        <SectionHeading
          as="h3"
          title={title}
          infoText={infoText}
          headingProps={headingProps}
          actions={registeredActions}
        />
        <div className={clsx("section-card-body", bodyClassName)}>{children}</div>
      </div>
    </SectionCardActionsContext.Provider>
  );
};

export default SectionCard;
