import React, { forwardRef, useCallback, useLayoutEffect, useRef } from "react";
import clsx from "clsx";

const AutoResizingTextarea = forwardRef(
  (
    {
      className,
      value,
      onChange,
      minRows = 3,
      maxRows = 10,
      style,
      ...props
    },
    forwardedRef
  ) => {
    const innerRef = useRef(null);

    const setRefs = useCallback(
      (node) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef]
    );

    useLayoutEffect(() => {
      const textarea = innerRef.current;
      if (!textarea) {
        return;
      }

      textarea.style.height = "auto";

      if (typeof window === "undefined") {
        return;
      }

      const computed = window.getComputedStyle(textarea);
      const lineHeight = parseFloat(computed.lineHeight || "0") || 0;
      const padding =
        parseFloat(computed.paddingTop || "0") + parseFloat(computed.paddingBottom || "0");
      const border =
        parseFloat(computed.borderTopWidth || "0") + parseFloat(computed.borderBottomWidth || "0");

      const minHeight = minRows * lineHeight + padding + border;
      const maxHeight = maxRows * lineHeight + padding + border;
      const fullHeight = textarea.scrollHeight;
      const clampedHeight = Math.max(minHeight || 0, Math.min(fullHeight, maxHeight || fullHeight));

      textarea.style.height = `${clampedHeight}px`;
      textarea.style.overflowY = fullHeight > maxHeight ? "auto" : "hidden";
    }, [value, minRows, maxRows]);

    return (
      <textarea
        ref={setRefs}
        className={clsx("auto-resizing-textarea", className)}
        value={value}
        onChange={onChange}
        style={{ ...style, resize: "vertical" }}
        rows={minRows}
        {...props}
      />
    );
  }
);

AutoResizingTextarea.displayName = "AutoResizingTextarea";

export default AutoResizingTextarea;
