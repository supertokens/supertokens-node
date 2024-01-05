// In Node.js versions 18 and above, nock doesn't support native fetch. To address this, we disable it using the `--no-experimental-fetch` flag. Since our code relies on fetch, we polyfill it with node-fetch.
// Related Issues:
// https://github.com/nock/nock/issues/2397
// https://github.com/nock/nock/issues/2183

const fetch = require("node-fetch");

if (!globalThis.fetch) {
    globalThis.fetch = fetch;
    globalThis.Headers = fetch.Headers;
    globalThis.Request = fetch.Request;
    globalThis.Response = fetch.Response;
}
