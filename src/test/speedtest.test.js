"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../main/speedtest.js");

test("isValidServerId accepts digits only", () => {
    assert.equal(Core.isValidServerId("12345"), true);
    assert.equal(Core.isValidServerId(""), false);
    assert.equal(Core.isValidServerId("12a45"), false);
    assert.equal(Core.isValidServerId("1; rm -rf /"), false);
    assert.equal(Core.isValidServerId(12345), false);
});

test("bytesPerSecToMbps converts bytes/sec to Mbit/sec", () => {
    assert.equal(Core.bytesPerSecToMbps(12500000), 100);
    assert.equal(Core.bytesPerSecToMbps(0), 0);
    assert.equal(Core.bytesPerSecToMbps(-1), null);
    assert.equal(Core.bytesPerSecToMbps(undefined), null);
    assert.equal(Core.formatMbps(12500000), "100.00");
});

test("parseServerList parses Ookla JSON output", () => {
    const output = JSON.stringify({
        servers: [
            { id: 12345, name: "Example", sponsor: "ISP", location: "Tokyo", country: "Japan", host: "example.jp" },
            { id: 6789, name: "Other", sponsor: "", location: "Osaka", country: "Japan", host: "" }
        ]
    });
    const servers = Core.parseServerList(output);
    assert.equal(servers.length, 2);
    assert.equal(servers[0].id, "12345");
    assert.equal(servers[0].location, "Tokyo");
    assert.match(Core.serverLabel(servers[0]), /Example/);
});

test("parseServerList parses human-readable output", () => {
    const output = [
        "Closest servers:",
        "    ID  Name                Location             Country",
        "==============================================================================",
        "  12345  Example Net         Tokyo                Japan",
        "   6789) Other Net           Osaka                Japan"
    ].join("\n");
    const servers = Core.parseServerList(output);
    assert.deepEqual(servers.map(s => s.id), ["12345", "6789"]);
});

test("parseServerList returns [] for empty output", () => {
    assert.deepEqual(Core.parseServerList(""), []);
    assert.deepEqual(Core.parseServerList("not json, no ids"), []);
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
    const event = Core.parseJsonlLine(line);
    assert.equal(event.kind, "result");
    const summary = Core.summarizeResult(event.data);
    assert.equal(summary.downloadMbps, "100.00");
    assert.equal(summary.uploadMbps, "50.00");
    assert.equal(summary.pingMs, "12.35");
    assert.equal(summary.serverName, "Example");
    assert.equal(summary.serverSponsor, "ISP");
});

test("parseJsonlLine exposes progress for download events", () => {
    const event = Core.parseJsonlLine(JSON.stringify({
        type: "download",
        download: { bandwidth: 1000000, progress: 0.5 }
    }));
    assert.equal(event.kind, "download");
    assert.equal(event.progress, 0.5);
    assert.equal(event.bandwidth, 1000000);
});

test("classifyError distinguishes the documented failure modes", () => {
    assert.equal(Core.classifyError("not-found", ""), "not-installed");
    assert.equal(Core.classifyError("", "Error: please accept the license terms"), "license");
    assert.equal(Core.classifyError("", "Unable to connect to the server"), "network");
    assert.equal(Core.classifyError("", "something else went wrong"), "unknown");
});
