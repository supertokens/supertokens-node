"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const custom_1 = require("./custom");
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
        originalImplementation.getConfigForClientType = function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const config = yield oGetConfig(input);
                if (config.scope === undefined) {
                    config.scope = ["r_emailaddress", "r_liteprofile"];
                }
                return config;
            });
        };
        originalImplementation.getUserInfo = function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const accessToken = input.oAuthTokens.accessToken;
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
                const userInfoFromAccessToken = yield utils_1.doGetRequest(
                    "https://api.linkedin.com/v2/me",
                    undefined,
                    headers
                );
                rawUserInfoFromProvider.fromUserInfoAPI = userInfoFromAccessToken;
                const emailAPIURL =
                    "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))";
                const userInfoFromEmail = yield utils_1.doGetRequest(emailAPIURL, undefined, headers);
                if (userInfoFromEmail.elements && userInfoFromEmail.elements.length > 0) {
                    rawUserInfoFromProvider.fromUserInfoAPI.email =
                        userInfoFromEmail.elements[0]["handle~"].emailAddress;
                }
                rawUserInfoFromProvider.fromUserInfoAPI = Object.assign(
                    Object.assign({}, rawUserInfoFromProvider.fromUserInfoAPI),
                    userInfoFromEmail
                );
                return {
                    thirdPartyUserId: rawUserInfoFromProvider.fromUserInfoAPI.id,
                    email: {
                        id: rawUserInfoFromProvider.fromUserInfoAPI.email,
                        isVerified: false,
                    },
                    rawUserInfoFromProvider,
                };
            });
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return custom_1.default(input);
}
exports.default = Linkedin;
