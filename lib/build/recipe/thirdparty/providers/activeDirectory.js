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
const utils_1 = require("./utils");
const implementation_1 = require("../api/implementation");
function AD(config) {
    const id = "active-directory";
    function get(redirectURI, authCodeFromRequest) {
        let accessTokenAPIURL = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
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
        let authorisationRedirectURL = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`;
        let scopes = ["email", "openid"];
        if (config.scope !== undefined) {
            scopes = config.scope;
            scopes = Array.from(new Set(scopes));
        }
        let additionalParams =
            config.authorisationRedirect === undefined || config.authorisationRedirect.params === undefined
                ? {}
                : config.authorisationRedirect.params;
        let authorizationRedirectParams = Object.assign(
            { scope: scopes.join(" "), response_type: "code", client_id: config.clientId },
            additionalParams
        );
        function getProfileInfo(authCodeResponse) {
            return __awaiter(this, void 0, void 0, function* () {
                let payload = yield utils_1.verifyIdTokenFromJWKSEndpoint(
                    authCodeResponse.id_token,
                    `https://login.microsoftonline.com/${config.tenantId}/discovery/v2.0/keys`,
                    {
                        audience: implementation_1.getActualClientIdFromDevelopmentClientId(config.clientId),
                        issuer: [`https://login.microsoftonline.com/${config.tenantId}/v2.0`],
                    }
                );
                if (payload.email === undefined) {
                    throw new Error("Could not get email. Please use a different login method");
                }
                if (payload.tid !== config.tenantId) {
                    throw new Error("Incorrect tenantId used for signing in.");
                }
                return {
                    id: payload.sub,
                    email: {
                        id: "example@email.com",
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
exports.default = AD;
