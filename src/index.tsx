import React from "react";
import { createRoot } from "react-dom/client";
import "@patternfly/react-core/dist/styles/base.css";
import { App } from "./App";
import "./index.css";

const rootElement = document.documentElement;

const hasDarkThemeHint = (element: Element | null): boolean => {
    if (!element) return false;

    for (const cls of Array.from(element.classList)) {
        if (/^pf-(?:v\d+-)?theme-dark$/.test(cls) || cls === "theme-dark") {
            return true;
        }
    }

    return element.getAttribute("data-theme") === "dark";
};

const hasLightThemeHint = (element: Element | null): boolean => {
    if (!element) return false;

    for (const cls of Array.from(element.classList)) {
        if (/^pf-(?:v\d+-)?theme-light$/.test(cls) || cls === "theme-light") {
            return true;
        }
    }

    return element.getAttribute("data-theme") === "light";
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

const syncDarkThemeClass = (): void => {
    const darkHint =
        hasDarkThemeHint(rootElement) ||
        hasDarkThemeHint(document.body) ||
        hasDarkThemeHint(getParentRoot());
    const lightHint =
        hasLightThemeHint(rootElement) ||
        hasLightThemeHint(document.body) ||
        hasLightThemeHint(getParentRoot());
    const dark = darkHint || (!lightHint && prefersDarkScheme());

    if (dark) {
        rootElement.classList.add("pf-v5-theme-dark");
        rootElement.classList.add("pf-theme-dark");
    } else {
        rootElement.classList.remove("pf-v5-theme-dark");
        rootElement.classList.remove("pf-theme-dark");
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
