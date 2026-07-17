// Small shared UI primitives used across tabs.
// Keep these stateless and free of feature-specific concerns.

import type { ReactNode } from "react";

export function PanelTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="panel-title">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}
