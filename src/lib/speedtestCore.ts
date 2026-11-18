import type {
    ErrorClassification,
    FormattedResult,
    SpeedtestJsonlEvent,
    SpeedtestResultEvent,
    SpeedtestServer
} from "../types/speedtest";

/**
 * サーバーIDは数字のみ（最大10桁）を許可する。
 */
export function isValidServerId(value: unknown): value is string {
    return typeof value === "string" && /^[0-9]{1,10}$/.test(value);
}

/**
 * バイト/秒 → Mbit/秒 (Ookla JSON の bandwidth は bytes/sec)
 */
export function bytesPerSecToMbps(bytesPerSec: unknown): number | null {
    if (typeof bytesPerSec !== "number" || !Number.isFinite(bytesPerSec) || bytesPerSec < 0) {
        return null;
    }
    return (bytesPerSec * 8) / 1000 / 1000;
}

export function formatMbps(bytesPerSec: unknown): string {
    const mbps = bytesPerSecToMbps(bytesPerSec);
    return mbps === null ? "–" : mbps.toFixed(2);
}

export function formatMs(value: unknown): string {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "–";
    }
    return value.toFixed(2);
}

/**
 * `speedtest --servers` の出力をサーバー一覧に変換する。
 */
export function parseServerList(output: unknown): SpeedtestServer[] {
    if (typeof output !== "string" || output.trim() === "") {
        return [];
    }

    const trimmed = output.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
            const data = JSON.parse(trimmed);
            if (data && typeof data === "object") {
                const list = Array.isArray(data) ? data : (data as { servers?: unknown[] }).servers;
                if (Array.isArray(list)) {
                    return list
                        .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === "object" && "id" in s))
                        .map((s) => ({
                            id: String(s.id),
                            name: String(s.name || ""),
                            sponsor: String(s.sponsor || ""),
                            location: String(s.location || ""),
                            country: String(s.country || ""),
                            host: String(s.host || "")
                        }));
                }
            }
        } catch {
            /* JSON でなければテキスト形式として続行 */
        }
    }

    const servers: SpeedtestServer[] = [];
    for (const line of trimmed.split(/\r?\n/)) {
        const m = line.match(/^\s*(\d+)\)?\s+(.+?)\s*$/);
        if (!m) continue;
        if (/^(ID|Closest servers)/i.test(m[2])) continue;

        servers.push({
            id: m[1],
            name: m[2].replace(/\s{2,}.*$/, "").trim() || m[2].trim(),
            sponsor: "",
            location: "",
            country: "",
            host: ""
        });
    }
    return servers;
}

export function serverLabel(server: SpeedtestServer): string {
    const parts: string[] = [];
    if (server.name) {
        parts.push(server.name);
    } else if (server.sponsor) {
        parts.push(server.sponsor);
    }
    const place = [server.location, server.country].filter(Boolean).join(", ");
    let label = parts.join(" ");
    if (place) {
        label = label ? `${label} — ${place}` : place;
    }
    if (server.sponsor && server.name && server.sponsor !== server.name) {
        label += `（${server.sponsor}）`;
    }
    return label ? `${label} (id: ${server.id})` : `id: ${server.id}`;
}

/**
 * `speedtest --format=jsonl` の1行を解釈する。
 */
export function parseJsonlLine(line: string): SpeedtestJsonlEvent | null {
    if (typeof line !== "string" || line.trim() === "") {
        return null;
    }
    let obj: Record<string, unknown>;
    try {
        const parsed = JSON.parse(line);
        if (!parsed || typeof parsed !== "object") {
            return { kind: "other", data: line };
        }
        obj = parsed as Record<string, unknown>;
    } catch {
        return { kind: "other", data: line };
    }

    const type = typeof obj.type === "string" ? obj.type : "";

    switch (type) {
        case "ping": {
            const ping = (obj.ping as { progress?: number }) || {};
            return {
                kind: "ping",
                data: obj as unknown as SpeedtestJsonlEvent["data"] & { type: "ping" },
                progress: typeof ping.progress === "number" ? ping.progress : null,
                bandwidth: null
            };
        }
        case "download":
        case "upload": {
            const sub = (obj[type] as { progress?: number; bandwidth?: number }) || {};
            return {
                kind: type,
                data: obj as unknown as SpeedtestJsonlEvent["data"] & { type: "download" | "upload" },
                progress: typeof sub.progress === "number" ? sub.progress : null,
                bandwidth: typeof sub.bandwidth === "number" ? sub.bandwidth : null
            };
        }
        case "result":
            return { kind: "result", data: obj as unknown as SpeedtestResultEvent };
        case "log":
            return { kind: "log", data: obj as unknown as SpeedtestJsonlEvent["data"] & { type: "log" } };
        case "error":
            return { kind: "error", data: obj as unknown as SpeedtestJsonlEvent["data"] & { type: "error" } };
        default:
            return { kind: "other", data: obj };
    }
}

/**
 * 最終結果 (type: "result") を表示用に整形する。
 */
export function summarizeResult(result: SpeedtestResultEvent | null | undefined): FormattedResult | null {
    if (!result || result.type !== "result") {
        return null;
    }
    const server = result.server || {};
    const downloadBw =
        result.download && typeof result.download.bandwidth === "number" ? result.download.bandwidth : undefined;
    const uploadBw =
        result.upload && typeof result.upload.bandwidth === "number" ? result.upload.bandwidth : undefined;
    const pingLatency =
        result.ping && typeof result.ping.latency === "number" ? result.ping.latency : undefined;

    return {
        downloadMbps: formatMbps(downloadBw),
        uploadMbps: formatMbps(uploadBw),
        pingMs: formatMs(pingLatency),
        serverName: server.name || "",
        serverSponsor: server.sponsor || "",
        serverLocation: [server.location, server.country].filter(Boolean).join(", "),
        serverId: server.id !== undefined ? String(server.id) : "",
        timestamp: result.timestamp || "",
        resultUrl: (result.result && result.result.url) || ""
    };
}

/**
 * CLI の失敗を、利用者向けの分類に振り分ける。
 */
export function classifyError(problem: unknown, message: unknown): ErrorClassification {
    const text = `${String(problem || "")} ${String(message || "")}`.toLowerCase();
    if (problem === "not-found" || /not found|no such file|command not found/.test(text)) {
        return "not-installed";
    }
    if (/license|eula|gdpr|terms/.test(text) && /accept|agree|consent/.test(text)) {
        return "license";
    }
    if (
        /unable to connect|failed to (connect|resolve)|network|timed out|timeout|dns|unreachable|connection/.test(
            text
        )
    ) {
        return "network";
    }
    return "unknown";
}
