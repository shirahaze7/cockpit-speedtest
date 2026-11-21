// 測定履歴と設定を localStorage で永続化するためのユーティリティ
import type { FormattedResult } from "../types/speedtest";

// localStorage に保存する際のキー名
export const STORAGE_KEY_HISTORY = "cockpit-speedtest.history-v1";
export const STORAGE_KEY_CONFIG = "cockpit-speedtest.config-v1";

// 履歴保持件数のデフォルト値および許容範囲
export const DEFAULT_MAX_HISTORY_ENTRIES = 20;
export const MIN_MAX_HISTORY_ENTRIES = 1;
export const MAX_MAX_HISTORY_ENTRIES = 1000;

// アプリ設定（現在は履歴保持件数のみ）
export interface AppConfig {
    maxHistoryEntries: number;
}

// 履歴一覧で一意に識別するための ID を付与した測定結果
export interface HistoryEntry extends FormattedResult {
    id: string;
}

/**
 * 保持件数の入力値バリデーション
 */
export function isValidMaxHistoryInput(input: string): boolean {
    const trimmed = input.trim();
    if (!/^\d+$/.test(trimmed)) {
        return false;
    }
    const val = parseInt(trimmed, 10);
    return !Number.isNaN(val) && val >= MIN_MAX_HISTORY_ENTRIES && val <= MAX_MAX_HISTORY_ENTRIES;
}

/**
 * 設定の読み込み
 */
export function loadConfig(storage: Pick<Storage, "getItem"> = window.localStorage): AppConfig {
    try {
        const raw = storage.getItem(STORAGE_KEY_CONFIG);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed?.maxHistoryEntries === "number" && !Number.isNaN(parsed.maxHistoryEntries)) {
                return {
                    maxHistoryEntries: clampHistoryLimit(parsed.maxHistoryEntries)
                };
            }
        }
    } catch {
        /* ignore parse or storage errors */
    }
    return { maxHistoryEntries: DEFAULT_MAX_HISTORY_ENTRIES };
}

/**
 * 設定の保存
 */
export function saveConfig(
    config: AppConfig,
    storage: Pick<Storage, "setItem"> = window.localStorage
): void {
    const sanitized: AppConfig = {
        maxHistoryEntries: clampHistoryLimit(config.maxHistoryEntries)
    };
    storage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(sanitized));
}

/**
 * 保持数を安全な範囲（1〜1000）に制限
 */
export function clampHistoryLimit(value: number): number {
    if (!Number.isFinite(value) || value < MIN_MAX_HISTORY_ENTRIES) {
        return MIN_MAX_HISTORY_ENTRIES;
    }
    if (value > MAX_MAX_HISTORY_ENTRIES) {
        return MAX_MAX_HISTORY_ENTRIES;
    }
    return Math.floor(value);
}

/**
 * 履歴一覧の読み込み
 */
export function loadHistory(storage: Pick<Storage, "getItem"> = window.localStorage): HistoryEntry[] {
    try {
        const raw = storage.getItem(STORAGE_KEY_HISTORY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.filter(isValidHistoryEntry);
            }
        }
    } catch {
        /* ignore parse or storage errors */
    }
    return [];
}

/**
 * 履歴一覧の保存
 */
export function saveHistory(
    history: readonly HistoryEntry[],
    storage: Pick<Storage, "setItem"> = window.localStorage
): void {
    storage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
}

/**
 * 新しい測定結果を履歴の先頭に追加し、上限数で切り詰める
 */
export function addHistoryEntry(
    history: readonly HistoryEntry[],
    newResult: FormattedResult,
    maxEntries: number
): HistoryEntry[] {
    // タイムスタンプと乱数を組み合わせて簡易な一意 ID を生成する
    const entry: HistoryEntry = {
        ...newResult,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    };
    // 新しい結果を先頭に追加し、保持上限を超えた古い履歴を切り捨てる
    const updated = [entry, ...history];
    const limit = clampHistoryLimit(maxEntries);
    return updated.slice(0, limit);
}

/**
 * 履歴エントリのバリデーション
 */
export function isValidHistoryEntry(entry: unknown): entry is HistoryEntry {
    // 破損データや古い形式を除外するため、必須フィールドの型を確認する
    if (typeof entry !== "object" || entry === null) {
        return false;
    }
    const e = entry as Record<string, unknown>;
    return (
        typeof e.id === "string" &&
        typeof e.downloadMbps === "string" &&
        typeof e.uploadMbps === "string" &&
        typeof e.pingMs === "string"
    );
}

/**
 * 日時文字列のフォーマット
 */
export function formatTimestamp(isoString: string | undefined): string {
    // ISO 文字列をローカル表示用に変換する（不正な値は元の文字列等でフォールバック）
    if (!isoString) return "–";
    const d = new Date(isoString);
    return Number.isNaN(d.getTime()) ? isoString : d.toLocaleString();
}
