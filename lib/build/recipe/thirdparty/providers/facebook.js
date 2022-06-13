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
function Facebook(config) {
    const id = "facebook";
    function get(redirectURI, authCodeFromRequest) {
        let accessTokenAPIURL = "https://graph.facebook.com/v9.0/oauth/access_token";
        let accessTokenAPIParams = {
            client_id: config.clientId,
            client_secret: config.clientSecret,
        };
        if (authCodeFromRequest !== undefined) {
            accessTokenAPIParams.code = authCodeFromRequest;
        }
        if (redirectURI !== undefined) {
            accessTokenAPIParams.redirect_uri = redirectURI;
        }
        let authorisationRedirectURL = "https://www.facebook.com/v9.0/dialog/oauth";
        let scopes = ["email"];
        if (config.scope !== undefined) {
            scopes = config.scope;
            scopes = Array.from(new Set(scopes));
        }
        let authorizationRedirectParams = {
            scope: scopes.join(" "),
            response_type: "code",
            client_id: config.clientId,
        };
        function getProfileInfo(accessTokenAPIResponse) {
            return __awaiter(this, void 0, void 0, function* () {
                let accessToken = accessTokenAPIResponse.access_token;
                let response = yield axios_1.default({
                    method: "get",
                    url: "https://graph.facebook.com/me",
                    params: {
                        access_token: accessToken,
                        fields: "id,email",
                        format: "json",
                    },
                });
                let userInfo = response.data;
                let id = userInfo.id;
                let email = userInfo.email;
                if (email === undefined || email === null) {
                    return {
                        id,
                    };
                }
                return {
                    id,
                    email: {
                        id: email,
                        isVerified: true,
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
exports.default = Facebook;
