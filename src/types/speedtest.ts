export interface SpeedtestServer {
    id: string;
    name: string;
    sponsor: string;
    location: string;
    country: string;
    host: string;
}

export interface SpeedtestPingEvent {
    type: "ping";
    ping: {
        jitter?: number;
        latency?: number;
        progress?: number;
    };
}

export interface SpeedtestBandwidthEvent {
    type: "download" | "upload";
    download?: {
        bandwidth?: number;
        bytes?: number;
        elapsed?: number;
        progress?: number;
    };
    upload?: {
        bandwidth?: number;
        bytes?: number;
        elapsed?: number;
        progress?: number;
    };
}

export interface SpeedtestResultEvent {
    type: "result";
    timestamp?: string;
    ping?: {
        latency?: number;
        jitter?: number;
    };
    download?: {
        bandwidth?: number;
        bytes?: number;
        elapsed?: number;
    };
    upload?: {
        bandwidth?: number;
        bytes?: number;
        elapsed?: number;
    };
    server?: {
        id?: number | string;
        name?: string;
        location?: string;
        country?: string;
        sponsor?: string;
        host?: string;
    };
    result?: {
        id?: string;
        url?: string;
    };
}

export interface SpeedtestLogEvent {
    type: "log";
    message?: string;
    level?: string;
}

export interface SpeedtestErrorEvent {
    type: "error";
    message?: string;
}

export type SpeedtestJsonlEvent =
    | {
          kind: "ping";
          data: SpeedtestPingEvent;
          progress: number | null;
          bandwidth: null;
      }
    | {
          kind: "download" | "upload";
          data: SpeedtestBandwidthEvent;
          progress: number | null;
          bandwidth: number | null;
      }
    | {
          kind: "result";
          data: SpeedtestResultEvent;
      }
    | {
          kind: "log";
          data: SpeedtestLogEvent;
      }
    | {
          kind: "error";
          data: SpeedtestErrorEvent;
      }
    | {
          kind: "other";
          data: unknown;
      };

export interface FormattedResult {
    downloadMbps: string;
    uploadMbps: string;
    pingMs: string;
    serverName: string;
    serverSponsor: string;
    serverLocation: string;
    serverId: string;
    timestamp: string;
    resultUrl: string;
}

export type ErrorClassification = "not-installed" | "license" | "network" | "unknown";
