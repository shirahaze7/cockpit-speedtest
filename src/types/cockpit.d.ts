declare module "cockpit" {
    export interface SpawnOptions {
        err?: "out" | "ignore" | "message";
        superuser?: "try" | "require";
        environ?: string[];
        directory?: string;
    }

    export interface SpawnPromise<T = string> extends Promise<T> {
        stream(callback: (chunk: string) => void): this;
        input(data: string, stream?: boolean): this;
        close(options?: boolean | string): this;
        always(callback: () => void): this;
    }

    export interface CockpitError {
        message?: string;
        problem?: "not-found" | "cancelled" | "access-denied" | "timeout" | "disconnected" | string;
        exit_status?: number;
    }

    export function spawn(args: string[], options?: SpawnOptions): SpawnPromise;

    const cockpit: {
        spawn: typeof spawn;
    };

    export default cockpit;
}

interface Window {
    cockpit?: typeof import("cockpit");
}
