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
const jsonwebtoken_1 = require("jsonwebtoken");
const error_1 = require("../error");
const implementation_1 = require("../api/implementation");
const supertokens_1 = require("../../../supertokens");
const constants_1 = require("../constants");
const verify_apple_id_token_1 = require("verify-apple-id-token");
function Apple(config) {
    const id = "apple";
    function getClientSecret(clientId, keyId, teamId, privateKey) {
        return jsonwebtoken_1.sign(
            {
                iss: teamId,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400 * 180,
                aud: "https://appleid.apple.com",
                sub: implementation_1.getActualClientIdFromDevelopmentClientId(clientId),
            },
            privateKey.replace(/\\n/g, "\n"),
            { algorithm: "ES256", keyid: keyId }
        );
    }
    try {
        // trying to generate a client secret, in case client has not passed the values correctly
        getClientSecret(
            config.clientId,
            config.clientSecret.keyId,
            config.clientSecret.teamId,
            config.clientSecret.privateKey
        );
    } catch (error) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: error.message,
        });
    }
    function get(redirectURI, authCodeFromRequest) {
        let accessTokenAPIURL = "https://appleid.apple.com/auth/token";
        let clientSecret = getClientSecret(
            config.clientId,
            config.clientSecret.keyId,
            config.clientSecret.teamId,
            config.clientSecret.privateKey
        );
        let accessTokenAPIParams = {
            client_id: config.clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
        };
        if (authCodeFromRequest !== undefined) {
            accessTokenAPIParams.code = authCodeFromRequest;
        }
        if (redirectURI !== undefined) {
            accessTokenAPIParams.redirect_uri = redirectURI;
        }
        let authorisationRedirectURL = "https://appleid.apple.com/auth/authorize";
        let scopes = ["email"];
        if (config.scope !== undefined) {
            scopes = config.scope;
            scopes = Array.from(new Set(scopes));
        }
        let additionalParams =
            config.authorisationRedirect === undefined || config.authorisationRedirect.params === undefined
                ? {}
                : config.authorisationRedirect.params;
        let authorizationRedirectParams = Object.assign(
            { scope: scopes.join(" "), response_mode: "form_post", response_type: "code", client_id: config.clientId },
            additionalParams
        );
        function getProfileInfo(accessTokenAPIResponse) {
            return __awaiter(this, void 0, void 0, function* () {
                /*
                - Verify the JWS E256 signature using the server’s public key
                - Verify the nonce for the authentication
                - Verify that the iss field contains https://appleid.apple.com
                - Verify that the aud field is the developer’s client_id
                - Verify that the time is earlier than the exp value of the token */
                const payload = yield verify_apple_id_token_1.default({
                    idToken: accessTokenAPIResponse.id_token,
                    clientId: implementation_1.getActualClientIdFromDevelopmentClientId(config.clientId),
                });
                if (payload === null) {
                    throw new Error("no user info found from user's id token received from apple");
                }
                let id = payload.sub;
                let email = payload.email;
                let isVerified = payload.email_verified;
                if (id === undefined || id === null) {
                    throw new Error("no user info found from user's id token received from apple");
                }
                return {
                    id,
                    email: {
                        id: email,
                        isVerified,
                    },
                };
            });
        }
        function getRedirectURI() {
            let supertokens = supertokens_1.default.getInstanceOrThrowError();
            return (
                supertokens.appInfo.apiDomain.getAsStringDangerous() +
                supertokens.appInfo.apiBasePath.getAsStringDangerous() +
                constants_1.APPLE_REDIRECT_HANDLER
            );
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
            getRedirectURI,
        };
    }
    return {
        id,
        get,
        isDefault: config.isDefault,
    };
}
exports.default = Apple;
