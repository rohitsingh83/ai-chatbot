"use client";

import { createContext, useContext, useState } from "react";

const ShellContext = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <ShellContext.Provider value={{ open, setOpen }}>{children}</ShellContext.Provider>;
}

export const useShell = () => useContext(ShellContext);
