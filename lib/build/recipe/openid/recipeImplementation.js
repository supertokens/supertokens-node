"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const constants_1 = require("../jwt/constants");
const constants_2 = require("../oauth2provider/constants");
function getRecipeInterface(config, jwtRecipeImplementation, appInfo) {
    return {
        getOpenIdDiscoveryConfiguration: async function () {
            let issuer = config.issuerDomain.getAsStringDangerous() + config.issuerPath.getAsStringDangerous();
            let jwks_uri =
                config.issuerDomain.getAsStringDangerous() +
                config.issuerPath
                    .appendPath(new normalisedURLPath_1.default(constants_1.GET_JWKS_API))
                    .getAsStringDangerous();
            const apiBasePath = appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();
            return {
                status: "OK",
                issuer,
                jwks_uri,
                authorization_endpoint: apiBasePath + constants_2.AUTH_PATH,
                token_endpoint: apiBasePath + constants_2.TOKEN_PATH,
                userinfo_endpoint: apiBasePath + constants_2.USER_INFO_PATH,
                revocation_endpoint: apiBasePath + constants_2.REVOKE_TOKEN_PATH,
                subject_types_supported: ["public"],
                id_token_signing_alg_values_supported: ["RS256"],
                response_types_supported: ["code", "id_token", "id_token token"],
            };
        },
        createJWT: async function ({ payload, validitySeconds, useStaticSigningKey, userContext }) {
            payload = payload === undefined || payload === null ? {} : payload;
            let issuer = config.issuerDomain.getAsStringDangerous() + config.issuerPath.getAsStringDangerous();
            return await jwtRecipeImplementation.createJWT({
                payload: Object.assign({ iss: issuer }, payload),
                useStaticSigningKey,
                validitySeconds,
                userContext,
            });
        },
        getJWKS: async function (input) {
            return await jwtRecipeImplementation.getJWKS(input);
        },
    };
}
exports.default = getRecipeInterface;
