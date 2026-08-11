import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TooltipContentProps } from "recharts";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslation } from "react-i18next";

import { useIsNarrowViewport, useIsTouchDevice } from "@/common/utils.ts";

type Payload<TValue extends number, TName extends string> = TooltipContentProps<
  TValue,
  TName
>["payload"];

interface Pinned<TValue extends number, TName extends string> {
  payload: Payload<TValue, TName>;
  label: TooltipContentProps<TValue, TName>["label"];
}

interface ChartTooltipProps<TValue extends number, TName extends string> extends Pick<
  TooltipContentProps<TValue, TName>,
  "active" | "payload" | "label"
> {
  children: (content: Pinned<TValue, TName>) => React.ReactNode;
}

/**
 * Shared `Tooltip` `content` renderer for every migrated chart (chart-component-contract's
 * Touch interaction section). On touch devices, the last active point stays pinned after
 * the finger lifts, until a different point is tapped or the dismiss control is used; on
 * narrow viewports the pinned content renders as a bottom sheet instead of following the
 * touch position.
 */
export function ChartTooltip<TValue extends number, TName extends string>({
  active,
  payload,
  label,
  children,
}: ChartTooltipProps<TValue, TName>) {
  const { t } = useTranslation();
  const isTouch = useIsTouchDevice();
  const isNarrow = useIsNarrowViewport();
  const [pinned, setPinned] = useState<Pinned<TValue, TName> | null>(null);
  const hasLiveData = Boolean(active && payload && payload.length > 0);
  // Recharts keeps `active`/`payload` truthy after a touch lifts (no touchend/leave clears
  // it), so an explicit dismiss must be remembered per-label -- otherwise the pin effect
  // below would immediately re-latch onto the still-active point on the next render.
  const dismissedLabelRef = useRef<Pinned<TValue, TName>["label"]>(undefined);

  useEffect(() => {
    if (isTouch && hasLiveData && label !== dismissedLabelRef.current)
      setPinned({ payload, label });
    // `payload` is a fresh array from Recharts on every render; keying off `label` (which only
    // changes when the active point actually changes) avoids re-running this effect every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTouch, hasLiveData, label]);

  useEffect(() => {
    if (!isTouch) setPinned(null);
  }, [isTouch]);

  const effective = isTouch ? pinned : hasLiveData ? { payload, label } : null;
  if (!effective) return null;

  const content = children(effective);
  const dismiss = () => {
    dismissedLabelRef.current = label;
    setPinned(null);
  };

  if (isTouch && isNarrow) {
    return createPortal(
      <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-150">
        <div className="relative mx-auto max-w-md rounded-t-lg border border-border bg-popover text-popover-foreground shadow-lg">
          <div className="flex justify-center pt-2">
            <div className="h-1 w-10 rounded-full bg-muted" />
          </div>
          <button
            type="button"
            aria-label={t("chartTooltip.dismiss")}
            onClick={dismiss}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
          <div className="px-4 pt-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">{content}</div>
        </div>
      </div>,
      document.body,
    );
  }

  if (isTouch) {
    return (
      <div className="relative">
        {content}
        <button
          type="button"
          aria-label={t("chartTooltip.dismiss")}
          onClick={dismiss}
          className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border border-border bg-popover text-muted-foreground hover:text-foreground"
        >
          <FontAwesomeIcon icon={faXmark} className="size-2.5" />
        </button>
      </div>
    );
  }

  return <>{content}</>;
}
