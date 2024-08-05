"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.normaliseOIDCEndpointToIncludeWellKnown = exports.discoverOIDCEndpoints = void 0;
const thirdpartyUtils_1 = require("../../../thirdpartyUtils");
const normalisedURLDomain_1 = __importDefault(require("../../../normalisedURLDomain"));
const normalisedURLPath_1 = __importDefault(require("../../../normalisedURLPath"));
async function discoverOIDCEndpoints(config) {
    if (config.oidcDiscoveryEndpoint !== undefined) {
        const oidcInfo = await thirdpartyUtils_1.getOIDCDiscoveryInfo(config.oidcDiscoveryEndpoint);
        if (oidcInfo.authorization_endpoint !== undefined && config.authorizationEndpoint === undefined) {
            config.authorizationEndpoint = oidcInfo.authorization_endpoint;
        }
        if (oidcInfo.token_endpoint !== undefined && config.tokenEndpoint === undefined) {
            config.tokenEndpoint = oidcInfo.token_endpoint;
        }
        if (oidcInfo.userinfo_endpoint !== undefined && config.userInfoEndpoint === undefined) {
            config.userInfoEndpoint = oidcInfo.userinfo_endpoint;
        }
        if (oidcInfo.jwks_uri !== undefined && config.jwksURI === undefined) {
            config.jwksURI = oidcInfo.jwks_uri;
        }
    }
}
exports.discoverOIDCEndpoints = discoverOIDCEndpoints;
function normaliseOIDCEndpointToIncludeWellKnown(url) {
    // we call this only for built-in providers that use OIDC. We no longer generically add well-known in the custom provider
    if (url.endsWith("/.well-known/openid-configuration") === true) {
        return url;
    }
    const normalisedDomain = new normalisedURLDomain_1.default(url);
    const normalisedPath = new normalisedURLPath_1.default(url);
    const normalisedWellKnownPath = new normalisedURLPath_1.default("/.well-known/openid-configuration");
    return (
        normalisedDomain.getAsStringDangerous() +
        normalisedPath.getAsStringDangerous() +
        normalisedWellKnownPath.getAsStringDangerous()
    );
}
exports.normaliseOIDCEndpointToIncludeWellKnown = normaliseOIDCEndpointToIncludeWellKnown;
