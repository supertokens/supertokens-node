// In Node.js versions 18 and above, nock doesn't support native fetch. To address this, we disable it using the `--no-experimental-fetch` flag. Since our code relies on fetch, we polyfill it with node-fetch.
// Related Issues:
// https://github.com/nock/nock/issues/2397
// https://github.com/nock/nock/issues/2183

import fetch, { Headers, Request, Response } from "cross-fetch";

// We also need to polyfill Response.json() since it's not available in node-fetch@2 but Next.JS uses it.
// This is taken from https://github.com/node-fetch/node-fetch/blob/8b3320d2a7c07bce4afc6b2bf6c3bbddda85b01f/src/response.js#L127-L144
function json(data = undefined, init = {}) {
    const body = JSON.stringify(data);

    if (body === undefined) {
        throw new TypeError("data is not JSON serializable");
    }

    const headers = new Headers(init && init.headers);

    if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
    }

    return new Response(body, {
        ...init,
        headers,
    });
}

if (!globalThis.fetch) {
    globalThis.fetch = fetch;
    globalThis.Headers = Headers;
    globalThis.Request = Request;
    globalThis.Response = Response;
    globalThis.Response.json = json;
}
