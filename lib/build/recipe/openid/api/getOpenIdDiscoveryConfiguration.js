"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
async function getOpenIdDiscoveryConfiguration(apiImplementation, options, userContext) {
    if (apiImplementation.getOpenIdDiscoveryConfigurationGET === undefined) {
        return false;
    }
    let result = await apiImplementation.getOpenIdDiscoveryConfigurationGET({
        options,
        userContext,
    });
    if (result.status === "OK") {
        options.res.setHeader("Access-Control-Allow-Origin", "*", false);
        utils_1.send200Response(options.res, {
            issuer: result.issuer,
            jwks_uri: result.jwks_uri,
        });
    } else {
        utils_1.send200Response(options.res, result);
    }
    return true;
}
exports.default = getOpenIdDiscoveryConfiguration;
