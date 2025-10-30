import React, { useState } from "react";
import clsx from "clsx";
import { BadgeInfo } from 'lucide-react';

const SectionHeading = ({
  as: Component = "h2",
  title,
  infoText,
  className = "",
  headingProps = {},
  actions = null
}) => {
  const [open, setOpen] = useState(false);
  const { className: headingClassName, ...restHeadingProps } = headingProps;
  const hasInfo = Boolean(infoText);

  return (
    <div className={clsx("section-heading text-black", className)}>
      <div className="section-heading-row">
        <div className="section-heading-main">
          <Component
            className={clsx("section-heading-title", headingClassName)}
            {...restHeadingProps}
          >
            {title}
          </Component>
          {hasInfo ? (
            <button
              type="button"
              className="section-heading-info-trigger"
              onClick={() => setOpen((current) => !current)}
              aria-expanded={open}
              aria-label={open ? "Hide info" : "Show info"}
            >
              <span aria-hidden="true"><BadgeInfo/></span>
            </button>
          ) : null}
        </div>
        {actions ? <div className="section-heading-actions">{actions}</div> : null}
      </div>
      {hasInfo && open ? (
        <div className="section-heading-info" role="note">
          {infoText}
        </div>
      ) : null}
    </div>
  );
};

export default SectionHeading;
