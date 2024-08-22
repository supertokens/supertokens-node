// process-polyfill.ts

// Declare the process object to avoid TypeScript errors
declare global {
    var process: {
        env: {
            NODE_ENV: string;
            NEXT_RUNTIME: string;
            [key: string]: string | undefined;
        };
    };
}

if (typeof process === "undefined") {
    (globalThis as any).process = {
        ...(globalThis.process ?? {}),
        env: {
            NODE_ENV: "development",
            NEXT_RUNTIME: "nodejs",
        },
    };
}

export {};
