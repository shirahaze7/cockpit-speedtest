// CLI 実行失敗時の分類（UI 表示や分岐に利用）
export const ERROR_CLASSIFICATIONS = [
    "not-installed",
    "license",
    "network",
    "unknown"
] as const;

export type ErrorClassification = (typeof ERROR_CLASSIFICATIONS)[number];

// 進捗表示対象となるイベント種別
export const PROGRESS_KINDS = ["ping", "download", "upload"] as const;
export type ProgressKind = (typeof PROGRESS_KINDS)[number];

// speedtest CLI (JSONL) から受け取り得るイベント種別
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

// 測定サーバー情報（一覧表示・選択・結果表示で使用）
export interface SpeedtestServer {
    readonly id: string;
    readonly name: string;
    readonly sponsor: string;
    readonly location: string;
    readonly country: string;
    readonly host: string;
}

// ping 計測イベント（遅延・ジッタ・進捗）
export interface SpeedtestPingEvent {
    readonly type: "ping";
    readonly ping?: {
        readonly jitter?: number;
        readonly latency?: number;
        readonly progress?: number;
    };
}

// ダウンロード/アップロード共通の帯域情報
export interface SpeedtestBandwidthDetails {
    readonly bandwidth?: number;
    readonly bytes?: number;
    readonly elapsed?: number;
    readonly progress?: number;
}

// download/upload イベントのペイロード
export interface SpeedtestBandwidthEvent {
    readonly type: "download" | "upload";
    readonly download?: SpeedtestBandwidthDetails;
    readonly upload?: SpeedtestBandwidthDetails;
}

// 最終結果イベント内のサーバー詳細情報
export interface SpeedtestServerDetails {
    readonly id?: number | string;
    readonly name?: string;
    readonly location?: string;
    readonly country?: string;
    readonly sponsor?: string;
    readonly host?: string;
}

// 測定完了時の result イベント（CLI の最終結果）
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

// CLI が出力するログイベント
export interface SpeedtestLogEvent {
    readonly type: "log";
    readonly message?: string;
    readonly level?: string;
}

// CLI が出力するエラーイベント
export interface SpeedtestErrorEvent {
    readonly type: "error";
    readonly message?: string;
}

// JSONL 1行をアプリ内部で扱いやすい形に正規化したイベント表現
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

// UI 表示用に整形済みの測定結果
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
