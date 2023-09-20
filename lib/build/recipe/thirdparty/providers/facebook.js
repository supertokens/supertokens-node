"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const custom_1 = __importDefault(require("./custom"));
function Facebook(input) {
    var _a;
    if (input.config.name === undefined) {
        input.config.name = "Facebook";
    }
    if (input.config.authorizationEndpoint === undefined) {
        input.config.authorizationEndpoint = "https://www.facebook.com/v12.0/dialog/oauth";
    }
    if (input.config.tokenEndpoint === undefined) {
        input.config.tokenEndpoint = "https://graph.facebook.com/v12.0/oauth/access_token";
    }
    if (input.config.userInfoEndpoint === undefined) {
        input.config.userInfoEndpoint = "https://graph.facebook.com/me";
    }
    input.config.userInfoMap = Object.assign(Object.assign({}, input.config.userInfoMap), {
        fromUserInfoAPI: Object.assign(
            { userId: "id" },
            (_a = input.config.userInfoMap) === null || _a === void 0 ? void 0 : _a.fromUserInfoAPI
        ),
    });
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function (input) {
            const config = await oGetConfig(input);
            if (config.scope === undefined) {
                config.scope = ["email"];
            }
            return config;
        };
        const oGetUserInfo = originalImplementation.getUserInfo;
        originalImplementation.getUserInfo = async function (input) {
            originalImplementation.config.userInfoEndpointQueryParams = Object.assign(
                { access_token: input.oAuthTokens.access_token, fields: "id,email", format: "json" },
                originalImplementation.config.userInfoEndpointQueryParams
            );
            originalImplementation.config.userInfoEndpointHeaders = Object.assign(
                Object.assign({}, originalImplementation.config.userInfoEndpointHeaders),
                { Authorization: null }
            );
            return await oGetUserInfo(input);
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return custom_1.default(input);
}
exports.default = Facebook;
