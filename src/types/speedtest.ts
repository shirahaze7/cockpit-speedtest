export const ERROR_CLASSIFICATIONS = [
    "not-installed",
    "license",
    "network",
    "unknown"
] as const;

export type ErrorClassification = (typeof ERROR_CLASSIFICATIONS)[number];

export const PROGRESS_KINDS = ["ping", "download", "upload"] as const;
export type ProgressKind = (typeof PROGRESS_KINDS)[number];

export const ALL_JSONL_KINDS = [
    "ping",
    "download",
    "upload",
    "result",
    "log",
    "error",
    "other"
] as const;
export type SpeedtestEventKind = (typeof ALL_JSONL_KINDS)[number];

export interface SpeedtestServer {
    readonly id: string;
    readonly name: string;
    readonly sponsor: string;
    readonly location: string;
    readonly country: string;
    readonly host: string;
}

export interface SpeedtestPingEvent {
    readonly type: "ping";
    readonly ping?: {
        readonly jitter?: number;
        readonly latency?: number;
        readonly progress?: number;
    };
}

export interface SpeedtestBandwidthDetails {
    readonly bandwidth?: number;
    readonly bytes?: number;
    readonly elapsed?: number;
    readonly progress?: number;
}

export interface SpeedtestBandwidthEvent {
    readonly type: "download" | "upload";
    readonly download?: SpeedtestBandwidthDetails;
    readonly upload?: SpeedtestBandwidthDetails;
}

export interface SpeedtestServerDetails {
    readonly id?: number | string;
    readonly name?: string;
    readonly location?: string;
    readonly country?: string;
    readonly sponsor?: string;
    readonly host?: string;
}

export interface SpeedtestResultEvent {
    readonly type: "result";
    readonly timestamp?: string;
    readonly ping?: {
        readonly latency?: number;
        readonly jitter?: number;
    };
    readonly download?: {
        readonly bandwidth?: number;
        readonly bytes?: number;
        readonly elapsed?: number;
    };
    readonly upload?: {
        readonly bandwidth?: number;
        readonly bytes?: number;
        readonly elapsed?: number;
    };
    readonly server?: SpeedtestServerDetails;
    readonly result?: {
        readonly id?: string;
        readonly url?: string;
    };
}

export interface SpeedtestLogEvent {
    readonly type: "log";
    readonly message?: string;
    readonly level?: string;
}

export interface SpeedtestErrorEvent {
    readonly type: "error";
    readonly message?: string;
}

export type SpeedtestJsonlEvent =
    | {
          readonly kind: "ping";
          readonly data: SpeedtestPingEvent;
          readonly progress: number | null;
          readonly bandwidth: null;
      }
    | {
          readonly kind: "download" | "upload";
          readonly data: SpeedtestBandwidthEvent;
          readonly progress: number | null;
          readonly bandwidth: number | null;
      }
    | {
          readonly kind: "result";
          readonly data: SpeedtestResultEvent;
      }
    | {
          readonly kind: "log";
          readonly data: SpeedtestLogEvent;
      }
    | {
          readonly kind: "error";
          readonly data: SpeedtestErrorEvent;
      }
    | {
          readonly kind: "other";
          readonly data: unknown;
      };

export interface FormattedResult {
    readonly downloadMbps: string;
    readonly uploadMbps: string;
    readonly pingMs: string;
    readonly serverName: string;
    readonly serverSponsor: string;
    readonly serverLocation: string;
    readonly serverId: string;
    readonly timestamp: string;
    readonly resultUrl: string;
}
