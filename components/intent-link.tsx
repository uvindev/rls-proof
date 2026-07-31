"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics";

type IntentLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  event: Extract<AnalyticsEvent, "team_interest" | "feedback_intent">;
  children: ReactNode;
};

export function IntentLink({
  event,
  children,
  onClick,
  ...props
}: IntentLinkProps) {
  return (
    <a
      {...props}
      onClick={(clickEvent) => {
        trackEvent(event);
        onClick?.(clickEvent);
      }}
    >
      {children}
    </a>
  );
}
