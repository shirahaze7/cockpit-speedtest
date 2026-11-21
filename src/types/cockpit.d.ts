// Cockpit が提供する JavaScript API の最小限の型定義（本拡張で利用する範囲）
declare module "cockpit" {
    // cockpit.spawn() に渡すオプション
    export interface SpawnOptions {
        readonly err?: "out" | "ignore" | "message";
        readonly superuser?: "try" | "require";
        readonly environ?: readonly string[];
        readonly directory?: string;
    }

    // spawn の戻り値（Promise 拡張。ストリーム受信や中断 API を持つ）
    export interface SpawnPromise<T = string> extends Promise<T> {
        stream(callback: (chunk: string) => void): this;
        input(data: string, stream?: boolean): this;
        close(options?: boolean | string): this;
        always(callback: () => void): this;
    }

    // Cockpit が返すエラーオブジェクトの代表的なプロパティ
    export interface CockpitError {
        readonly message?: string;
        readonly problem?: "not-found" | "cancelled" | "access-denied" | "timeout" | "disconnected" | string;
        readonly exit_status?: number;
    }

    // コマンドを非シェルで起動する API
    export function spawn(args: readonly string[], options?: SpawnOptions): SpawnPromise;

    const cockpit: {
        readonly spawn: typeof spawn;
    };

    export default cockpit;
}

// Cockpit 実行環境で window.cockpit が利用可能であることを宣言する
interface Window {
    readonly cockpit: typeof import("cockpit");
}
