"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getOpenIdDiscoveryConfiguration;
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
        (0, utils_1.send200Response)(options.res, {
            issuer: result.issuer,
            jwks_uri: result.jwks_uri,
            authorization_endpoint: result.authorization_endpoint,
            token_endpoint: result.token_endpoint,
            userinfo_endpoint: result.userinfo_endpoint,
            revocation_endpoint: result.revocation_endpoint,
            token_introspection_endpoint: result.token_introspection_endpoint,
            end_session_endpoint: result.end_session_endpoint,
            subject_types_supported: result.subject_types_supported,
            id_token_signing_alg_values_supported: result.id_token_signing_alg_values_supported,
            response_types_supported: result.response_types_supported,
        });
    } else {
        (0, utils_1.send200Response)(options.res, result);
    }
    return true;
}
