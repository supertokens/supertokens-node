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
const axios_1 = require("axios");
function Discord(config) {
    const id = "discord";
    function get(redirectURI, authCodeFromRequest) {
        let accessTokenAPIURL = "https://discord.com/api/oauth2/token";
        let accessTokenAPIParams = {
            client_id: config.clientId,
            client_secret: config.clientSecret,
            grant_type: "authorization_code",
        };
        if (authCodeFromRequest !== undefined) {
            accessTokenAPIParams.code = authCodeFromRequest;
        }
        if (redirectURI !== undefined) {
            accessTokenAPIParams.redirect_uri = redirectURI;
        }
        let authorisationRedirectURL = "https://discord.com/api/oauth2/authorize";
        let scopes = ["email", "identify"];
        if (config.scope !== undefined) {
            scopes = config.scope;
            scopes = Array.from(new Set(scopes));
        }
        let additionalParams =
            config.authorisationRedirect === undefined || config.authorisationRedirect.params === undefined
                ? {}
                : config.authorisationRedirect.params;
        let authorizationRedirectParams = Object.assign(
            { scope: scopes.join(" "), client_id: config.clientId, response_type: "code" },
            additionalParams
        );
        function getProfileInfo(accessTokenAPIResponse) {
            return __awaiter(this, void 0, void 0, function* () {
                let accessToken = accessTokenAPIResponse.access_token;
                let authHeader = `Bearer ${accessToken}`;
                let response = yield axios_1.default({
                    method: "get",
                    url: "https://discord.com/api/users/@me",
                    headers: {
                        Authorization: authHeader,
                    },
                });
                let userInfo = response.data;
                return {
                    id: userInfo.id,
                    email:
                        userInfo.email === undefined
                            ? undefined
                            : {
                                  id: userInfo.email,
                                  isVerified: userInfo.verified,
                              },
                };
            });
        }
        return {
            accessTokenAPI: {
                url: accessTokenAPIURL,
                params: accessTokenAPIParams,
            },
            authorisationRedirect: {
                url: authorisationRedirectURL,
                params: authorizationRedirectParams,
            },
            getProfileInfo,
            getClientId: () => {
                return config.clientId;
            },
        };
    }
    return {
        id,
        get,
        isDefault: config.isDefault,
    };
}
exports.default = Discord;
