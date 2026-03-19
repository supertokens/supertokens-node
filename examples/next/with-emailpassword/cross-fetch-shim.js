// Shim that re-exports native fetch for edge runtime compatibility.
// Replaces cross-fetch which uses XMLHttpRequest in its browser ponyfill.
module.exports = fetch;
module.exports.default = fetch;
module.exports.fetch = fetch;
module.exports.Headers = Headers;
module.exports.Request = Request;
module.exports.Response = Response;
