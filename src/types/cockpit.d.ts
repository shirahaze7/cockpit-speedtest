declare module "cockpit" {
    export interface SpawnOptions {
        readonly err?: "out" | "ignore" | "message";
        readonly superuser?: "try" | "require";
        readonly environ?: readonly string[];
        readonly directory?: string;
    }

    export interface SpawnPromise<T = string> extends Promise<T> {
        stream(callback: (chunk: string) => void): this;
        input(data: string, stream?: boolean): this;
        close(options?: boolean | string): this;
        always(callback: () => void): this;
    }

    export interface CockpitError {
        readonly message?: string;
        readonly problem?: "not-found" | "cancelled" | "access-denied" | "timeout" | "disconnected" | string;
        readonly exit_status?: number;
    }

    export function spawn(args: readonly string[], options?: SpawnOptions): SpawnPromise;

    const cockpit: {
        readonly spawn: typeof spawn;
    };

    export default cockpit;
}

interface Window {
    readonly cockpit: typeof import("cockpit");
}
