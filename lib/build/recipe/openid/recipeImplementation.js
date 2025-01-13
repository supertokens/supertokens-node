"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getRecipeInterface;
const recipe_1 = __importDefault(require("../jwt/recipe"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const constants_1 = require("../jwt/constants");
const constants_2 = require("../oauth2provider/constants");
function getRecipeInterface(appInfo) {
    return {
        getOpenIdDiscoveryConfiguration: async function () {
            let issuer = appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();
            let jwks_uri =
                appInfo.apiDomain.getAsStringDangerous() +
                appInfo.apiBasePath
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
                token_introspection_endpoint: apiBasePath + constants_2.INTROSPECT_TOKEN_PATH,
                end_session_endpoint: apiBasePath + constants_2.END_SESSION_PATH,
                subject_types_supported: ["public"],
                id_token_signing_alg_values_supported: ["RS256"],
                response_types_supported: ["code", "id_token", "id_token token"],
            };
        },
        createJWT: async function ({ payload, validitySeconds, useStaticSigningKey, userContext }) {
            payload = payload === undefined || payload === null ? {} : payload;
            let issuer = (await this.getOpenIdDiscoveryConfiguration({ userContext })).issuer;
            return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createJWT({
                payload: Object.assign({ iss: issuer }, payload),
                useStaticSigningKey,
                validitySeconds,
                userContext,
            });
        },
    };
}
