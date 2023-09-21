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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const custom_1 = __importDefault(require("./custom"));
const utils_1 = require("./utils");
function Twitter(input) {
    var _a;
    if (input.config.name === undefined) {
        input.config.name = "Twitter";
    }
    if (input.config.authorizationEndpoint === undefined) {
        input.config.authorizationEndpoint = "https://twitter.com/i/oauth2/authorize";
    }
    if (input.config.tokenEndpoint === undefined) {
        input.config.tokenEndpoint = "https://api.twitter.com/2/oauth2/token";
    }
    if (input.config.userInfoEndpoint === undefined) {
        input.config.userInfoEndpoint = "https://api.twitter.com/2/users/me";
    }
    if (input.config.requireEmail === undefined) {
        input.config.requireEmail = false;
    }
    input.config.userInfoMap = Object.assign(
        {
            fromUserInfoAPI: Object.assign(
                { userId: "data.id" },
                (_a = input.config.userInfoMap) === null || _a === void 0 ? void 0 : _a.fromUserInfoAPI
            ),
        },
        input.config.userInfoMap
    );
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const config = yield oGetConfig(input);
                if (config.scope === undefined) {
                    config.scope = ["users.read", "tweet.read"];
                }
                if (config.forcePKCE === undefined) {
                    config.forcePKCE = true;
                }
                return config;
            });
        };
        originalImplementation.exchangeAuthCodeForOAuthTokens = function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const basicAuthToken = Buffer.from(
                    `${originalImplementation.config.clientId}:${originalImplementation.config.clientSecret}`,
                    "utf8"
                ).toString("base64");
                const twitterOauthTokenParams = Object.assign(
                    {
                        grant_type: "authorization_code",
                        client_id: originalImplementation.config.clientId,
                        code_verifier: input.redirectURIInfo.pkceCodeVerifier,
                        redirect_uri: input.redirectURIInfo.redirectURIOnProviderDashboard,
                        code: input.redirectURIInfo.redirectURIQueryParams.code,
                    },
                    originalImplementation.config.tokenEndpointBodyParams
                );
                return yield utils_1.doPostRequest(
                    originalImplementation.config.tokenEndpoint,
                    twitterOauthTokenParams,
                    {
                        Authorization: `Basic ${basicAuthToken}`,
                    }
                );
            });
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return custom_1.default(input);
}
exports.default = Twitter;
