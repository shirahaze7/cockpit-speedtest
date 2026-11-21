// speedtestCore.ts のユーティリティ関数に対する単体テスト
import test from "node:test";
import assert from "node:assert/strict";
import {
    bytesPerSecToMbps,
    classifyError,
    formatMbps,
    formatMs,
    isCockpitError,
    isOoklaCli,
    isRecord,
    isValidServerId,
    parseJsonlLine,
    parseServerList,
    serverLabel,
    summarizeResult
} from "../lib/speedtestCore";

test("isValidServerId accepts digits only", () => {
    assert.equal(isValidServerId("12345"), true);
    assert.equal(isValidServerId(""), false);
    assert.equal(isValidServerId("12a45"), false);
    assert.equal(isValidServerId("1; rm -rf /"), false);
    assert.equal(isValidServerId(12345), false);
});

test("bytesPerSecToMbps converts bytes/sec to Mbit/sec", () => {
    assert.equal(bytesPerSecToMbps(12500000), 100);
    assert.equal(bytesPerSecToMbps(0), 0);
    assert.equal(bytesPerSecToMbps(-1), null);
    assert.equal(bytesPerSecToMbps(undefined), null);
    assert.equal(formatMbps(12500000), "100.00");
    assert.equal(formatMbps(0), "0.00");
    assert.equal(formatMs(0), "0.00");
});

test("parseServerList parses Ookla JSON output", () => {
    const output = JSON.stringify({
        servers: [
            { id: 12345, name: "Example", sponsor: "ISP", location: "Tokyo", country: "Japan", host: "example.jp" },
            { id: 6789, name: "Other", sponsor: "", location: "Osaka", country: "Japan", host: "" }
        ]
    });
    const servers = parseServerList(output);
    assert.equal(servers.length, 2);
    assert.equal(servers[0]?.id, "12345");
    assert.equal(servers[0]?.location, "Tokyo");
    assert.match(serverLabel(servers[0]!), /Example/);
});

test("parseServerList parses human-readable output", () => {
    const output = [
        "Closest servers:",
        "    ID  Name                Location             Country",
        "==============================================================================",
        "  12345  Example Net         Tokyo                Japan",
        "   6789) Other Net           Osaka                Japan"
    ].join("\n");
    const servers = parseServerList(output);
    assert.deepEqual(
        servers.map((s) => s.id),
        ["12345", "6789"]
    );
});

test("parseServerList returns [] for empty output", () => {
    assert.deepEqual(parseServerList(""), []);
    assert.deepEqual(parseServerList("not json, no ids"), []);
    assert.deepEqual(parseServerList("null"), []);
    assert.deepEqual(parseServerList("123"), []);
});

test("serverLabel formats correctly without name or sponsor", () => {
    const label = serverLabel({
        id: "999",
        name: "",
        sponsor: "",
        location: "Tokyo",
        country: "Japan",
        host: ""
    });
    assert.equal(label, "Tokyo, Japan (id: 999)");
});

test("isRecord and isCockpitError type guards correctly identify objects", () => {
    assert.equal(isRecord({}), true);
    assert.equal(isRecord(null), false);
    assert.equal(isRecord("string"), false);
    assert.equal(isRecord(123), false);

    assert.equal(isCockpitError({ problem: "not-found" }), true);
    assert.equal(isCockpitError(null), false);
    assert.equal(isCockpitError(undefined), false);
    assert.equal(isCockpitError("error"), false);
});

test("isOoklaCli distinguishes Ookla CLI from other speedtest implementations", () => {
    assert.equal(isOoklaCli("Speedtest by Ookla 1.2.0"), true);
    assert.equal(isOoklaCli("speedtest-cli 2.1.3"), false);
    assert.equal(isOoklaCli("2.1.3"), false);
    assert.equal(isOoklaCli(undefined), false);
});

test("parseJsonlLine safely handles non-object and null JSON", () => {
    assert.equal(parseJsonlLine("null")?.kind, "other");
    assert.equal(parseJsonlLine("123")?.kind, "other");
    assert.equal(parseJsonlLine('"string"')?.kind, "other");
    assert.equal(parseJsonlLine(""), null);
});

test("summarizeResult handles zero bandwidth and ping properly", () => {
    const summary = summarizeResult({
        type: "result",
        timestamp: "2026-11-18T00:00:00Z",
        ping: { latency: 0 },
        download: { bandwidth: 0 },
        upload: { bandwidth: 0 },
        server: { id: 1 }
    });
    assert.equal(summary?.downloadMbps, "0.00");
    assert.equal(summary?.uploadMbps, "0.00");
    assert.equal(summary?.pingMs, "0.00");
});

test("parseJsonlLine and summarizeResult handle a result event", () => {
    const line = JSON.stringify({
        type: "result",
        timestamp: "2026-11-18T00:00:00Z",
        ping: { latency: 12.345, jitter: 1.2 },
        download: { bandwidth: 12500000 },
        upload: { bandwidth: 6250000 },
        server: { id: 12345, name: "Example", sponsor: "ISP", location: "Tokyo", country: "Japan" },
        result: { url: "https://www.speedtest.net/result/c/example" }
    });
    const event = parseJsonlLine(line);
    assert.equal(event?.kind, "result");
    if (event?.kind === "result") {
        const summary = summarizeResult(event.data);
        assert.equal(summary?.downloadMbps, "100.00");
        assert.equal(summary?.uploadMbps, "50.00");
        assert.equal(summary?.pingMs, "12.35");
        assert.equal(summary?.serverName, "Example");
        assert.equal(summary?.serverSponsor, "ISP");
    }
});

test("classifyError distinguishes the documented failure modes", () => {
    assert.equal(classifyError("not-found", ""), "not-installed");
    assert.equal(classifyError("", "Error: please accept the license terms"), "license");
    assert.equal(classifyError("", "Unable to connect to the server"), "network");
    assert.equal(classifyError("", "something else went wrong"), "unknown");
});
