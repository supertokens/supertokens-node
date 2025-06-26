"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Google;
const custom_1 = __importDefault(require("./custom"));
const utils_1 = require("./utils");
function Google(input) {
    if (input.config.name === undefined) {
        input.config.name = "Google";
    }
    if (input.config.oidcDiscoveryEndpoint === undefined) {
        input.config.oidcDiscoveryEndpoint = "https://accounts.google.com/.well-known/openid-configuration";
    }
    input.config.authorizationEndpointQueryParams = Object.assign(
        { included_grant_scopes: "true", access_type: "offline" },
        input.config.authorizationEndpointQueryParams
    );
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function (input) {
            const config = await oGetConfig(input);
            if (config.scope === undefined) {
                config.scope = ["openid", "email"];
            }
            // The config could be coming from core where we didn't add the well-known previously
            config.oidcDiscoveryEndpoint = (0, utils_1.normaliseOIDCEndpointToIncludeWellKnown)(
                config.oidcDiscoveryEndpoint
            );
            return config;
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return (0, custom_1.default)(input);
}
