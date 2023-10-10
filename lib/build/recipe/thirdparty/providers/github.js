"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const custom_1 = __importDefault(require("./custom"));
const utils_1 = require("./utils");
function getSupertokensUserInfoFromRawUserInfoResponseForGithub(rawUserInfoResponse) {
    if (rawUserInfoResponse.fromUserInfoAPI === undefined) {
        throw new Error("rawUserInfoResponse.fromUserInfoAPI is not available");
    }
    const result = {
        thirdPartyUserId: `${rawUserInfoResponse.fromUserInfoAPI.user.id}`,
        rawUserInfoFromProvider: {
            fromIdTokenPayload: {},
            fromUserInfoAPI: {},
        },
    };
    const emailsInfo = rawUserInfoResponse.fromUserInfoAPI.emails;
    for (const info of emailsInfo) {
        if (info.primary) {
            result.email = {
                id: info.email,
                isVerified: info.verified,
            };
        }
    }
    return result;
}
function Github(input) {
    if (input.config.name === undefined) {
        input.config.name = "Github";
    }
    if (input.config.authorizationEndpoint === undefined) {
        input.config.authorizationEndpoint = "https://github.com/login/oauth/authorize";
    }
    if (input.config.tokenEndpoint === undefined) {
        input.config.tokenEndpoint = "https://github.com/login/oauth/access_token";
    }
    if (input.config.validateAccessToken === undefined) {
        input.config.validateAccessToken = async ({ accessToken, clientConfig }) => {
            const basicAuthToken = Buffer.from(
                `${clientConfig.clientId}:${clientConfig.clientSecret === undefined ? "" : clientConfig.clientSecret}`
            ).toString("base64");
            const applicationResponse = await utils_1.doPostRequest(
                `https://api.github.com/applications/${clientConfig.clientId}/token`,
                {
                    access_token: accessToken,
                },
                {
                    Authorization: `Basic ${basicAuthToken}`,
                    "Content-Type": "application/json",
                }
            );
            if (applicationResponse.status !== 200) {
                throw new Error("Invalid access token");
            }
            if (
                applicationResponse.jsonResponse.app === undefined ||
                applicationResponse.jsonResponse.app.client_id !== clientConfig.clientId
            ) {
                throw new Error("Access token does not belong to your application");
            }
        };
    }
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function (input) {
            const config = await oGetConfig(input);
            if (config.scope === undefined) {
                config.scope = ["read:user", "user:email"];
            }
            return config;
        };
        originalImplementation.getUserInfo = async function (input) {
            const headers = {
                Authorization: `Bearer ${input.oAuthTokens.access_token}`,
                Accept: "application/vnd.github.v3+json",
            };
            const rawResponse = {};
            const emailInfoResp = await utils_1.doGetRequest("https://api.github.com/user/emails", undefined, headers);
            if (emailInfoResp.status >= 400) {
                throw new Error(
                    `Getting userInfo failed with ${emailInfoResp.status}: ${emailInfoResp.stringResponse}`
                );
            }
            rawResponse.emails = emailInfoResp.jsonResponse;
            const userInfoResp = await utils_1.doGetRequest("https://api.github.com/user", undefined, headers);
            if (userInfoResp.status >= 400) {
                throw new Error(`Getting userInfo failed with ${userInfoResp.status}: ${userInfoResp.stringResponse}`);
            }
            rawResponse.user = userInfoResp.jsonResponse;
            const rawUserInfoFromProvider = {
                fromUserInfoAPI: rawResponse,
                fromIdTokenPayload: {},
            };
            const userInfoResult = getSupertokensUserInfoFromRawUserInfoResponseForGithub(rawUserInfoFromProvider);
            return Object.assign(Object.assign({}, userInfoResult), { rawUserInfoFromProvider });
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return custom_1.default(input);
}
exports.default = Github;
