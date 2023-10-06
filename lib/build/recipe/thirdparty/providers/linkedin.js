"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const custom_1 = __importDefault(require("./custom"));
const utils_1 = require("./utils");
function Linkedin(input) {
    if (input.config.name === undefined) {
        input.config.name = "LinkedIn";
    }
    if (input.config.authorizationEndpoint === undefined) {
        input.config.authorizationEndpoint = "https://www.linkedin.com/oauth/v2/authorization";
    }
    if (input.config.tokenEndpoint === undefined) {
        input.config.tokenEndpoint = "https://www.linkedin.com/oauth/v2/accessToken";
    }
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function (input) {
            const config = await oGetConfig(input);
            if (config.scope === undefined) {
                config.scope = ["r_emailaddress", "r_liteprofile"];
            }
            return config;
        };
        originalImplementation.getUserInfo = async function (input) {
            const accessToken = input.oAuthTokens.access_token;
            if (accessToken === undefined) {
                throw new Error("Access token not found");
            }
            const headers = {
                Authorization: `Bearer ${accessToken}`,
            };
            let rawUserInfoFromProvider = {
                fromUserInfoAPI: {},
                fromIdTokenPayload: {},
            };
            const userInfoFromAccessToken = await utils_1.doGetRequest(
                "https://api.linkedin.com/v2/me",
                undefined,
                headers
            );
            rawUserInfoFromProvider.fromUserInfoAPI = userInfoFromAccessToken.response;
            const emailAPIURL = "https://api.linkedin.com/v2/emailAddress";
            const userInfoFromEmail = await utils_1.doGetRequest(
                emailAPIURL,
                { q: "members", projection: "(elements*(handle~))" },
                headers
            );
            if (userInfoFromEmail.response.elements && userInfoFromEmail.response.elements.length > 0) {
                rawUserInfoFromProvider.fromUserInfoAPI.email =
                    userInfoFromEmail.response.elements[0]["handle~"].emailAddress;
            }
            rawUserInfoFromProvider.fromUserInfoAPI = Object.assign(
                Object.assign({}, rawUserInfoFromProvider.fromUserInfoAPI),
                userInfoFromEmail.response
            );
            return {
                thirdPartyUserId: rawUserInfoFromProvider.fromUserInfoAPI.id,
                email: {
                    id: rawUserInfoFromProvider.fromUserInfoAPI.email,
                    isVerified: false,
                },
                rawUserInfoFromProvider,
            };
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return custom_1.default(input);
}
exports.default = Linkedin;
