"use client";

import { useEffect, useState } from "react";

/** Read the live CSS tokens so charts follow the theme and accent colour. */
export function useThemeColors(dep: unknown) {
  const [c, setC] = useState({ accent: "rgb(124 92 255)", accent2: "rgb(56 189 248)", muted: "#8b8ea3", grid: "rgba(127,127,160,0.15)", panel: "#12121f", text: "#ecebf5" });
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const v = (k: string) => s.getPropertyValue(k).trim();
      setC({
        accent: `rgb(${v("--accent")})`,
        accent2: `rgb(${v("--accent-2")})`,
        muted: v("--subtle"),
        grid: v("--border"),
        panel: v("--panel-solid"),
        text: v("--text"),
      });
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-accent"] });
    return () => obs.disconnect();
  }, [dep]);
  return c;
}
