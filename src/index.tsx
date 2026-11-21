import React from "react";
import { createRoot } from "react-dom/client";
import "@patternfly/react-core/dist/styles/base.css";
import { App } from "./App";
import "./index.css";

const rootElement = document.documentElement;
const managedThemeClasses = ["pf-v5-theme-dark", "pf-theme-dark"] as const;

type ThemeHint = "dark" | "light" | null;

const getThemeHint = (
    element: Element | null,
    ignoreManagedClasses = false
): ThemeHint => {
    if (!element) return null;

    const theme = element.getAttribute("data-theme");
    if (theme === "dark") return "dark";
    if (theme === "light") return "light";

    for (const cls of Array.from(element.classList)) {
        if (
            ignoreManagedClasses &&
            (cls === "pf-v5-theme-dark" || cls === "pf-theme-dark")
        ) {
            continue;
        }
        if (/^pf-(?:v\d+-)?theme-dark$/.test(cls) || cls === "theme-dark") {
            return "dark";
        }
        if (/^pf-(?:v\d+-)?theme-light$/.test(cls) || cls === "theme-light") {
            return "light";
        }
    }

    return null;
};

const getParentRoot = (): Element | null => {
    try {
        if (window.parent && window.parent !== window) {
            return window.parent.document.documentElement;
        }
    } catch {
        // Ignore cross-origin access errors.
    }
    return null;
};

const prefersDarkScheme = (): boolean =>
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

const getDesiredDarkTheme = (): boolean => {
    const parentHint = getThemeHint(getParentRoot());
    if (parentHint) return parentHint === "dark";

    const rootHint = getThemeHint(rootElement, true);
    if (rootHint) return rootHint === "dark";

    const bodyHint = getThemeHint(document.body);
    if (bodyHint) return bodyHint === "dark";

    return prefersDarkScheme();
};

const syncDarkThemeClass = (): void => {
    const dark = getDesiredDarkTheme();

    for (const cls of managedThemeClasses) {
        rootElement.classList.toggle(cls, dark);
    }
};

syncDarkThemeClass();

const observer = new MutationObserver(syncDarkThemeClass);
observer.observe(rootElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"]
});

if (document.body) {
    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class", "data-theme"]
    });
} else {
    document.addEventListener("DOMContentLoaded", () => {
        syncDarkThemeClass();
        if (document.body) {
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ["class", "data-theme"]
            });
        }
    });
}

const parentRoot = getParentRoot();
if (parentRoot) {
    observer.observe(parentRoot, {
        attributes: true,
        attributeFilter: ["class", "data-theme"]
    });
}

if (typeof window.matchMedia === "function") {
    const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    if (typeof darkScheme.addEventListener === "function") {
        darkScheme.addEventListener("change", syncDarkThemeClass);
    } else if (typeof darkScheme.addListener === "function") {
        darkScheme.addListener(syncDarkThemeClass);
    }
}

const container = document.getElementById("app");
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
