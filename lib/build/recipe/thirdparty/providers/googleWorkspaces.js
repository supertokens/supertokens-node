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
function GW(config) {
    const id = "google-workspaces";
    let domain = config.domain === undefined ? "*" : config.domain;
    function get(redirectURI, authCodeFromRequest) {
        let accessTokenAPIURL = "https://accounts.google.com/o/oauth2/token";
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
        let authorisationRedirectURL = "https://accounts.google.com/o/oauth2/v2/auth";
        let scopes = ["https://www.googleapis.com/auth/userinfo.email"];
        if (config.scope !== undefined) {
            scopes = config.scope;
            scopes = Array.from(new Set(scopes));
        }
        let additionalParams =
            config.authorisationRedirect === undefined || config.authorisationRedirect.params === undefined
                ? {}
                : config.authorisationRedirect.params;
        let authorizationRedirectParams = Object.assign(
            {
                scope: scopes.join(" "),
                access_type: "offline",
                include_granted_scopes: "true",
                response_type: "code",
                client_id: config.clientId,
                hd: domain,
            },
            additionalParams
        );
        function getProfileInfo(authCodeResponse) {
            return __awaiter(this, void 0, void 0, function* () {
                let payload = yield utils_1.verifyIdTokenFromJWKSEndpoint(
                    authCodeResponse.id_token,
                    "https://www.googleapis.com/oauth2/v3/certs",
                    {
                        audience: implementation_1.getActualClientIdFromDevelopmentClientId(config.clientId),
                        issuer: ["https://accounts.google.com", "accounts.google.com"],
                    }
                );
                if (payload.email === undefined) {
                    throw new Error("Could not get email. Please use a different login method");
                }
                if (payload.hd === undefined) {
                    throw new Error("Please use a Google Workspace ID to login");
                }
                // if the domain is "*" in it, it means that any workspace email is allowed.
                if (!domain.includes("*") && payload.hd !== domain) {
                    throw new Error("Please use emails from " + domain + " to login");
                }
                return {
                    id: payload.sub,
                    email: {
                        id: payload.email,
                        isVerified: payload.email_verified,
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
exports.default = GW;
