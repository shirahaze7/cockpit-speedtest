/*
 * speedtest.js — Ookla Speedtest CLI の出力パースなど、純粋なロジック集。
 * cockpit API には依存しないため、Node.js で単体テストできる。
 * ブラウザでは window.SpeedtestCore として、Node では module.exports として公開する。
 */
(function (global) {
    "use strict";

    /* サーバーIDは数字のみを許可する。画面から受け取った値を
     * コマンド引数として渡す際の検証（spawn は配列形式で使うため
     * シェル経由の注入は起きないが、多層防御として検証する）。 */
    function isValidServerId(value) {
        return typeof value === "string" && /^[0-9]{1,10}$/.test(value);
    }

    /* バイト/秒 → Mbit/秒 (Ookla JSON の bandwidth は bytes/sec) */
    function bytesPerSecToMbps(bytesPerSec) {
        if (typeof bytesPerSec !== "number" || !isFinite(bytesPerSec) || bytesPerSec < 0)
            return null;
        return bytesPerSec * 8 / 1000 / 1000;
    }

    function formatMbps(bytesPerSec) {
        var mbps = bytesPerSecToMbps(bytesPerSec);
        return mbps === null ? "–" : mbps.toFixed(2);
    }

    function formatMs(value) {
        if (typeof value !== "number" || !isFinite(value))
            return "–";
        return value.toFixed(2);
    }

    /*
     * `speedtest --servers` の出力をサーバー一覧に変換する。
     * - --format=json の場合: {"servers":[{id,name,sponsor,location,country,host}, ...]}
     *   または配列そのものを受け付ける。
     * - 人間向け形式の場合: 行頭の ID を拾って残りを名前として扱う。
     */
    function parseServerList(output) {
        if (typeof output !== "string" || output.trim() === "")
            return [];

        var trimmed = output.trim();
        if (trimmed.charAt(0) === "{" || trimmed.charAt(0) === "[") {
            try {
                var data = JSON.parse(trimmed);
                var list = Array.isArray(data) ? data : data.servers;
                if (Array.isArray(list)) {
                    return list.filter(function (s) { return s && s.id !== undefined; })
                            .map(function (s) {
                                return {
                                    id: String(s.id),
                                    name: s.name || "",
                                    sponsor: s.sponsor || "",
                                    location: s.location || "",
                                    country: s.country || "",
                                    host: s.host || ""
                                };
                            });
                }
            } catch (e) {
                /* JSON でなければテキスト形式として続行 */
            }
        }

        var servers = [];
        trimmed.split(/\r?\n/).forEach(function (line) {
            /* 例: "  12345) Foo Bar    Tokyo, Japan"
             *     "  12345  Foo Bar    Tokyo                Japan" */
            var m = line.match(/^\s*(\d+)\)?\s+(.+?)\s*$/);
            if (!m)
                return;
            if (/^(ID|Closest servers)/i.test(m[2]))
                return;
            servers.push({
                id: m[1],
                name: m[2].replace(/\s{2,}.*$/, "").trim() || m[2].trim(),
                sponsor: "",
                location: "",
                country: "",
                host: ""
            });
        });
        return servers;
    }

    function serverLabel(server) {
        var parts = [];
        if (server.name)
            parts.push(server.name);
        else if (server.sponsor)
            parts.push(server.sponsor);
        var place = [server.location, server.country].filter(Boolean).join(", ");
        var label = parts.join(" ");
        if (place)
            label += label ? " — " + place : place;
        if (server.sponsor && server.name && server.sponsor !== server.name)
            label += "（" + server.sponsor + "）";
        return label ? label + " (id: " + server.id + ")" : "id: " + server.id;
    }

    /*
     * `speedtest --format=jsonl` の1行を解釈する。
     * 戻り値: {kind: "ping"|"download"|"upload"|"result"|"log"|"error"|"other", data}
     */
    function parseJsonlLine(line) {
        if (typeof line !== "string" || line.trim() === "")
            return null;
        var obj;
        try {
            obj = JSON.parse(line);
        } catch (e) {
            return { kind: "other", data: line };
        }
        switch (obj.type) {
        case "ping":
        case "download":
        case "upload":
            return {
                kind: obj.type,
                data: obj,
                progress: typeof (obj[obj.type] && obj[obj.type].progress) === "number"
                    ? obj[obj.type].progress : null,
                bandwidth: typeof (obj[obj.type] && obj[obj.type].bandwidth) === "number"
                    ? obj[obj.type].bandwidth : null
            };
        case "result":
            return { kind: "result", data: obj };
        case "log":
            return { kind: "log", data: obj };
        case "error":
            return { kind: "error", data: obj };
        default:
            return { kind: obj.type || "other", data: obj };
        }
    }

    /* 最終結果 (type: "result") を表示用に整形する */
    function summarizeResult(result) {
        if (!result || result.type !== "result")
            return null;
        var server = result.server || {};
        return {
            downloadMbps: formatMbps(result.download && result.download.bandwidth),
            uploadMbps: formatMbps(result.upload && result.upload.bandwidth),
            pingMs: formatMs(result.ping && result.ping.latency),
            serverName: server.name || "",
            serverSponsor: server.sponsor || "",
            serverLocation: [server.location, server.country].filter(Boolean).join(", "),
            serverId: server.id !== undefined ? String(server.id) : "",
            timestamp: result.timestamp || "",
            resultUrl: (result.result && result.result.url) || ""
        };
    }

    /*
     * CLI の失敗を、利用者向けの分類に振り分ける。
     * kind: "not-installed" | "license" | "network" | "unknown"
     */
    function classifyError(problem, message) {
        var text = ((problem || "") + " " + (message || "")).toLowerCase();
        if (problem === "not-found" || /not found|no such file|command not found/.test(text))
            return "not-installed";
        if (/license|eula|gdpr|terms/.test(text) && /accept|agree|consent/.test(text))
            return "license";
        if (/unable to connect|failed to (connect|resolve)|network|timed out|timeout|dns|unreachable|connection/.test(text))
            return "network";
        return "unknown";
    }

    var api = {
        isValidServerId: isValidServerId,
        bytesPerSecToMbps: bytesPerSecToMbps,
        formatMbps: formatMbps,
        formatMs: formatMs,
        parseServerList: parseServerList,
        serverLabel: serverLabel,
        parseJsonlLine: parseJsonlLine,
        summarizeResult: summarizeResult,
        classifyError: classifyError
    };

    if (typeof module !== "undefined" && module.exports)
        module.exports = api;
    global.SpeedtestCore = api;
})(typeof window !== "undefined" ? window : globalThis);
