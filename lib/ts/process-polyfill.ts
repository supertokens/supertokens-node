if (typeof process === "undefined") {
    global.process = {
        ...(globalThis.process ?? {}),
        env: {
            NODE_ENV: "development",
            NEXT_RUNTIME: "nodejs",
        },
    };
}
