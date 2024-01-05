// In Node.js versions 18 and above, nock doesn't support native fetch. To address this, we disable it using the `--no-experimental-fetch` flag. Since our code relies on fetch, we polyfill it with node-fetch.
// Related Issues:
// https://github.com/nock/nock/issues/2397
// https://github.com/nock/nock/issues/2183

import fetch, { Headers, Request, Response } from "node-fetch";

if (!globalThis.fetch) {
    globalThis.fetch = fetch;
    globalThis.Headers = Headers;
    globalThis.Request = Request;
    globalThis.Response = Response;
}
