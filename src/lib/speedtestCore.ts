import type { CockpitError } from "cockpit";
import type {
    ErrorClassification,
    FormattedResult,
    SpeedtestBandwidthEvent,
    SpeedtestErrorEvent,
    SpeedtestJsonlEvent,
    SpeedtestLogEvent,
    SpeedtestPingEvent,
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

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function isCockpitError(value: unknown): value is CockpitError {
    return isRecord(value);
}

/**
 * `speedtest --servers` の出力をサーバー一覧に変換する。
 */
export function parseServerList(output: unknown): readonly SpeedtestServer[] {
    if (typeof output !== "string" || output.trim() === "") {
        return [];
    }

    const trimmed = output.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
            const data: unknown = JSON.parse(trimmed);
            if (isRecord(data) || Array.isArray(data)) {
                const list: unknown = Array.isArray(data) ? data : data["servers"];
                if (Array.isArray(list)) {
                    return list
                        .filter((s): s is Record<string, unknown> => isRecord(s) && "id" in s)
                        .map((s): SpeedtestServer => ({
                            id: String(s["id"] ?? ""),
                            name: String(s["name"] ?? ""),
                            sponsor: String(s["sponsor"] ?? ""),
                            location: String(s["location"] ?? ""),
                            country: String(s["country"] ?? ""),
                            host: String(s["host"] ?? "")
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
        if (!m || !m[1] || !m[2]) continue;
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
    let parsed: unknown;
    try {
        parsed = JSON.parse(line);
    } catch {
        return { kind: "other", data: line };
    }

    if (!isRecord(parsed)) {
        return { kind: "other", data: line };
    }

    const type = typeof parsed["type"] === "string" ? parsed["type"] : "";

    switch (type) {
        case "ping": {
            const pingRaw = isRecord(parsed["ping"]) ? parsed["ping"] : {};
            const ping: SpeedtestPingEvent["ping"] = {
                ...(typeof pingRaw["jitter"] === "number" ? { jitter: pingRaw["jitter"] } : {}),
                ...(typeof pingRaw["latency"] === "number" ? { latency: pingRaw["latency"] } : {}),
                ...(typeof pingRaw["progress"] === "number" ? { progress: pingRaw["progress"] } : {})
            };
            return {
                kind: "ping",
                data: {
                    type: "ping",
                    ...(Object.keys(ping).length > 0 ? { ping } : {})
                },
                progress: typeof ping.progress === "number" ? ping.progress : null,
                bandwidth: null
            };
        }
        case "download":
        case "upload": {
            const sub = isRecord(parsed[type]) ? parsed[type] : {};
            const progress = typeof sub["progress"] === "number" ? sub["progress"] : null;
            const bandwidth = typeof sub["bandwidth"] === "number" ? sub["bandwidth"] : null;
            return {
                kind: type,
                data: parsed as unknown as SpeedtestBandwidthEvent,
                progress,
                bandwidth
            };
        }
        case "result":
            return { kind: "result", data: parsed as unknown as SpeedtestResultEvent };
        case "log":
            return { kind: "log", data: parsed as unknown as SpeedtestLogEvent };
        case "error":
            return { kind: "error", data: parsed as unknown as SpeedtestErrorEvent };
        default:
            return { kind: "other", data: parsed };
    }
}

/**
 * 最終結果 (type: "result") を表示用に整形する。
 */
export function summarizeResult(result: SpeedtestResultEvent | null | undefined): FormattedResult | null {
    if (!result || result.type !== "result") {
        return null;
    }
    const server = result.server ?? {};
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
        serverName: server.name ?? "",
        serverSponsor: server.sponsor ?? "",
        serverLocation: [server.location, server.country].filter(Boolean).join(", "),
        serverId: server.id !== undefined ? String(server.id) : "",
        timestamp: result.timestamp ?? "",
        resultUrl: result.result?.url ?? ""
    };
}

/**
 * CLI の失敗を、利用者向けの分類に振り分ける。
 */
export function classifyError(problem: unknown, message: unknown): ErrorClassification {
    const text = `${String(problem ?? "")} ${String(message ?? "")}`.toLowerCase();
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
