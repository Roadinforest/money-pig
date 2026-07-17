// Wrapper around the .icon-button class so JSX stays short and the
// click target is identical wherever it is rendered.

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  small?: boolean;
  title: string;
  children: ReactNode;
}

export function IconButton({ small, title, children, className, ...rest }: IconButtonProps) {
  const sizeClass = small ? "icon-button small" : "icon-button";
  const finalClass = className ? `${sizeClass} ${className}` : sizeClass;
  return (
    <button type="button" className={finalClass} title={title} {...rest}>
      {children}
    </button>
  );
}
