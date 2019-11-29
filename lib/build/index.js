"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const ST = require("./express");
const querier_1 = require("./querier");
__export(require("./express"));
var error_1 = require("./error");
exports.Error = error_1.AuthError;
// TODO: remove below and import queries above
ST.init([
    {
        hostname: "localhost",
        port: 8080
    }
]);
querier_1.Querier.getInstance()
    .sendPostRequest("/", {})
    .then(a => {
        console.log(a);
    })
    .catch(err => {
        console.log(err);
    });
//# sourceMappingURL=index.js.map
