import * as ST from "./express";
import { Querier } from "./querier";

export * from "./express";

export { AuthError as Error } from "./error";

// TODO: remove below and import queries above
ST.init([
    {
        hostname: "localhost",
        port: 8080
    }
]);

Querier.getInstance()
    .sendPostRequest("/", {})
    .then(a => {
        console.log(a);
    })
    .catch(err => {
        console.log(err);
    });
