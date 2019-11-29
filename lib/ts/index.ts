import * as ST from "./express";

export * from "./express";

export { AuthError as Error } from "./error";

// TODO: remove below and import queries above
ST.init([
    {
        hostname: "localhost",
        port: 8080
    }
]);
