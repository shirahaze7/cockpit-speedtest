// historyStorage.ts の永続化・バリデーション・整形処理に対する単体テスト
import test from "node:test";
import assert from "node:assert/strict";
import {
    addHistoryEntry,
    clampHistoryLimit,
    DEFAULT_MAX_HISTORY_ENTRIES,
    loadConfig,
    loadHistory,
    saveConfig,
    saveHistory,
    isValidMaxHistoryInput,
    formatTimestamp,
    type HistoryEntry
} from "../lib/historyStorage";
import type { FormattedResult } from "../types/speedtest";

// localStorage の代替として使う簡易モック
class MockStorage {
    private store: Record<string, string> = {};

    getItem(key: string): string | null {
        return this.store[key] ?? null;
    }

    setItem(key: string, value: string): void {
        this.store[key] = value;
    }

    clear(): void {
        this.store = {};
    }
}

const dummyResult: FormattedResult = {
    downloadMbps: "100.00",
    uploadMbps: "50.00",
    pingMs: "12.34",
    serverName: "Tokyo Server",
    serverSponsor: "ISP A",
    serverLocation: "Tokyo",
    serverId: "1234",
    timestamp: "2026-11-22T05:00:00Z",
    resultUrl: "https://www.speedtest.net/result/c/12345"
};

test("clampHistoryLimit correctly handles limits and bounds", () => {
    assert.equal(clampHistoryLimit(10), 10);
    assert.equal(clampHistoryLimit(0), 1);
    assert.equal(clampHistoryLimit(-5), 1);
    assert.equal(clampHistoryLimit(2000), 1000);
    assert.equal(clampHistoryLimit(NaN), 1);
    assert.equal(clampHistoryLimit(15.7), 15);
});

test("loadConfig returns defaults on empty or invalid storage", () => {
    const storage = new MockStorage();
    assert.deepEqual(loadConfig(storage), { maxHistoryEntries: DEFAULT_MAX_HISTORY_ENTRIES });

    storage.setItem("cockpit-speedtest.config-v1", "invalid json");
    assert.deepEqual(loadConfig(storage), { maxHistoryEntries: DEFAULT_MAX_HISTORY_ENTRIES });

    storage.setItem("cockpit-speedtest.config-v1", JSON.stringify({ maxHistoryEntries: -10 }));
    assert.deepEqual(loadConfig(storage), { maxHistoryEntries: 1 });
});

test("saveConfig and loadConfig preserve config values", () => {
    const storage = new MockStorage();
    saveConfig({ maxHistoryEntries: 50 }, storage);
    assert.deepEqual(loadConfig(storage), { maxHistoryEntries: 50 });
});

test("saveHistory and loadHistory work correctly and filter invalid entries", () => {
    const storage = new MockStorage();
    assert.deepEqual(loadHistory(storage), []);

    const validEntry: HistoryEntry = {
        ...dummyResult,
        id: "entry-1"
    };
    saveHistory([validEntry], storage);
    assert.deepEqual(loadHistory(storage), [validEntry]);

    storage.setItem("cockpit-speedtest.history-v1", JSON.stringify([validEntry, { invalid: true }]));
    assert.deepEqual(loadHistory(storage), [validEntry]);
});

test("addHistoryEntry prepends entry and respects maxEntries limit", () => {
    let history: HistoryEntry[] = [];
    history = addHistoryEntry(history, dummyResult, 2);
    assert.equal(history.length, 1);
    assert.equal(history[0]?.downloadMbps, "100.00");
    assert.ok(history[0]?.id);

    const secondResult = { ...dummyResult, downloadMbps: "200.00" };
    history = addHistoryEntry(history, secondResult, 2);
    assert.equal(history.length, 2);
    assert.equal(history[0]?.downloadMbps, "200.00");

    const thirdResult = { ...dummyResult, downloadMbps: "300.00" };
    history = addHistoryEntry(history, thirdResult, 2);
    assert.equal(history.length, 2);
    assert.equal(history[0]?.downloadMbps, "300.00");
    assert.equal(history[1]?.downloadMbps, "200.00");
});

test("isValidMaxHistoryInput validates numeric strings within 1-1000", () => {
    assert.equal(isValidMaxHistoryInput("20"), true);
    assert.equal(isValidMaxHistoryInput("1"), true);
    assert.equal(isValidMaxHistoryInput("1000"), true);
    assert.equal(isValidMaxHistoryInput("0"), false);
    assert.equal(isValidMaxHistoryInput("1001"), false);
    assert.equal(isValidMaxHistoryInput("abc"), false);
    assert.equal(isValidMaxHistoryInput("-1"), false);
    assert.equal(isValidMaxHistoryInput(""), false);
});

test("formatTimestamp safely formats date strings", () => {
    assert.equal(formatTimestamp(""), "–");
    assert.equal(formatTimestamp(undefined), "–");
    assert.equal(formatTimestamp("invalid-date"), "invalid-date");
    assert.notEqual(formatTimestamp("2026-11-22T05:00:00Z"), "–");
});
