"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const constants_1 = require("../jwt/constants");
function getRecipeInterface(config, jwtRecipeImplementation) {
    return {
        getOpenIdDiscoveryConfiguration: async function () {
            let issuer = config.issuerDomain.getAsStringDangerous() + config.issuerPath.getAsStringDangerous();
            let jwks_uri =
                config.issuerDomain.getAsStringDangerous() +
                config.issuerPath
                    .appendPath(new normalisedURLPath_1.default(constants_1.GET_JWKS_API))
                    .getAsStringDangerous();
            return {
                status: "OK",
                issuer,
                jwks_uri,
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
