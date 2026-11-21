import React from "react";
import { createRoot } from "react-dom/client";
// PatternFly の基本スタイルを読み込む
import "@patternfly/react-core/dist/styles/base.css";
import { App } from "./App";
import "./index.css";

// テーマ判定の基準となるルート要素
const rootElement = document.documentElement;
// このアプリが管理するダークテーマ用クラス名
const managedThemeClasses = ["pf-v5-theme-dark", "pf-theme-dark"] as const;

// テーマ判定結果（dark / light / 判定不能）
type ThemeHint = "dark" | "light" | null;

// 指定要素の属性やクラス名からダーク/ライトテーマのヒントを取得する
const getThemeHint = (
    element: Element | null,
    ignoreManagedClasses = false
): ThemeHint => {
    if (!element) return null;

    // data-theme 属性が明示されている場合はそれを優先する
    const theme = element.getAttribute("data-theme");
    if (theme === "dark") return "dark";
    if (theme === "light") return "light";

    // クラス名から PatternFly 等のテーマ指定を判定する
    for (const cls of Array.from(element.classList)) {
        if (
            ignoreManagedClasses &&
            (cls === "pf-v5-theme-dark" || cls === "pf-theme-dark")
        ) {
            // 自身が付与した管理対象クラスは判定元から除外できるようにする
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

// 親フレーム（Cockpit シェル）のルート要素を取得する（クロスオリジン時は無視）
const getParentRoot = (): Element | null => {
    try {
        if (window.parent && window.parent !== window) {
            return window.parent.document.documentElement;
        }
    } catch {
        // クロスオリジンアクセスエラーは無視する
    }
    return null;
};

// OS/ブラウザのダークモード設定を取得する
const prefersDarkScheme = (): boolean =>
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

// 親フレーム・自身の要素・システム設定の順で最終的なテーマを決定する
const getDesiredDarkTheme = (): boolean => {
    const parentHint = getThemeHint(getParentRoot());
    if (parentHint) return parentHint === "dark";

    const rootHint = getThemeHint(rootElement, true);
    if (rootHint) return rootHint === "dark";

    const bodyHint = getThemeHint(document.body);
    if (bodyHint) return bodyHint === "dark";

    return prefersDarkScheme();
};

// 現在の判定結果に合わせてダークテーマ用クラスを付け外しする
const syncDarkThemeClass = (): void => {
    const dark = getDesiredDarkTheme();

    for (const cls of managedThemeClasses) {
        rootElement.classList.toggle(cls, dark);
    }
};

// 初期表示時にテーマを同期する
syncDarkThemeClass();

// ルート要素の属性変化を監視し、テーマ変更に追従する
const observer = new MutationObserver(syncDarkThemeClass);
observer.observe(rootElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"]
});

// body のテーマ属性変化も監視対象にする（未生成なら DOMContentLoaded 後に設定）
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

// 親フレーム側のテーマ変更も検知して同期する
const parentRoot = getParentRoot();
if (parentRoot) {
    observer.observe(parentRoot, {
        attributes: true,
        attributeFilter: ["class", "data-theme"]
    });
}

// システムの配色設定変更にも追従する
if (typeof window.matchMedia === "function") {
    const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    if (typeof darkScheme.addEventListener === "function") {
        darkScheme.addEventListener("change", syncDarkThemeClass);
    } else if (typeof darkScheme.addListener === "function") {
        darkScheme.addListener(syncDarkThemeClass);
    }
}

// React アプリを #app 要素にマウントする
const container = document.getElementById("app");
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
