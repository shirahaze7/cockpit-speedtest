import React from "react";
import { createRoot } from "react-dom/client";
import "@patternfly/react-core/dist/styles/base.css";
import { App } from "./App";
import "./index.css";

const rootElement = document.documentElement;

const syncDarkThemeClass = (): void => {
    const dark =
        rootElement.classList.contains("pf-v5-theme-dark") ||
        rootElement.classList.contains("pf-theme-dark");

    if (dark) {
        rootElement.classList.add("pf-v5-theme-dark");
        rootElement.classList.add("pf-theme-dark");
    } else {
        rootElement.classList.remove("pf-v5-theme-dark");
        rootElement.classList.remove("pf-theme-dark");
    }
};

syncDarkThemeClass();
new MutationObserver(syncDarkThemeClass).observe(rootElement, {
    attributes: true,
    attributeFilter: ["class"]
});

const container = document.getElementById("app");
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
