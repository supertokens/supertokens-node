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
function Github(config) {
    const id = "github";
    function get(redirectURI, authCodeFromRequest) {
        let accessTokenAPIURL = "https://github.com/login/oauth/access_token";
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
        let authorisationRedirectURL = "https://github.com/login/oauth/authorize";
        let scopes = ["read:user", "user:email"];
        if (config.scope !== undefined) {
            scopes = config.scope;
            scopes = Array.from(new Set(scopes));
        }
        let additionalParams =
            config.authorisationRedirect === undefined || config.authorisationRedirect.params === undefined
                ? {}
                : config.authorisationRedirect.params;
        let authorizationRedirectParams = Object.assign(
            { scope: scopes.join(" "), client_id: config.clientId },
            additionalParams
        );
        function getProfileInfo(accessTokenAPIResponse) {
            return __awaiter(this, void 0, void 0, function* () {
                let accessToken = accessTokenAPIResponse.access_token;
                let authHeader = `Bearer ${accessToken}`;
                let response = yield axios_1.default({
                    method: "get",
                    url: "https://api.github.com/user",
                    headers: {
                        Authorization: authHeader,
                        Accept: "application/vnd.github.v3+json",
                    },
                });
                let emailsInfoResponse = yield axios_1.default({
                    url: "https://api.github.com/user/emails",
                    headers: {
                        Authorization: authHeader,
                        Accept: "application/vnd.github.v3+json",
                    },
                });
                let userInfo = response.data;
                let emailsInfo = emailsInfoResponse.data;
                let id = userInfo.id.toString(); // github userId will be a number
                /*
                    if user has choosen not to show their email publicly, userInfo here will
                    have email as null. So we instead get the info from the emails api and
                    use the email which is marked as primary one.
    
                    Sample github response for email info
                    [
                        {
                            email: '<email>',
                            primary: true,
                            verified: true,
                            visibility: 'public'
                        }
                    ]
                */
                let emailInfo = emailsInfo.find((e) => e.primary);
                if (emailInfo === undefined) {
                    return {
                        id,
                    };
                }
                let isVerified = emailInfo !== undefined ? emailInfo.verified : false;
                return {
                    id,
                    email:
                        emailInfo.email === undefined
                            ? undefined
                            : {
                                  id: emailInfo.email,
                                  isVerified,
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
exports.default = Github;
