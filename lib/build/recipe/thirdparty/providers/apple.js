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
const utils_1 = require("../../../utils");
const jsonwebtoken_1 = require("jsonwebtoken");
const error_1 = require("../error");
const InputSchemaTypeThirdPartyProviderAppleConfig = {
    type: "object",
    properties: {
        clientId: {
            type: "string",
        },
        clientSecret: {
            type: "object",
            properties: {
                keyId: {
                    type: "string",
                },
                privateKey: {
                    type: "string",
                },
                teamId: {
                    type: "string",
                },
            },
            required: ["keyId", "privateKey", "teamId"],
            additionalProperties: false,
        },
        scope: {
            type: "array",
            items: {
                type: "string",
            },
        },
        authorisationRedirect: {
            type: "object",
            properties: {
                params: {
                    type: "any",
                },
            },
            additionalProperties: false,
        },
    },
    required: ["clientId", "clientSecret"],
    additionalProperties: false,
};
function Apple(config) {
    utils_1.validateTheStructureOfUserInput(
        config,
        InputSchemaTypeThirdPartyProviderAppleConfig,
        "thirdparty recipe, provider apple"
    );
    const id = "apple";
    function getClientSecret(clientId, keyId, teamId, privateKey) {
        return jsonwebtoken_1.sign(
            {
                iss: teamId,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400 * 180,
                aud: "https://appleid.apple.com",
                sub: clientId,
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
        return __awaiter(this, void 0, void 0, function* () {
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
            if (!scopes.includes("email")) {
                throw Error("Scope email is required. Please add it to the scope array");
            }
            let additionalParams =
                config.authorisationRedirect === undefined || config.authorisationRedirect.params === undefined
                    ? {}
                    : config.authorisationRedirect.params;
            let authorizationRedirectParams = Object.assign(
                {
                    scope: scopes.join(" "),
                    response_mode: "form_post",
                    response_type: "code",
                    client_id: config.clientId,
                },
                additionalParams
            );
            function getProfileInfo(accessTokenAPIResponse) {
                return __awaiter(this, void 0, void 0, function* () {
                    let payload = jsonwebtoken_1.decode(accessTokenAPIResponse.id_token);
                    if (payload === null) {
                        throw new Error("no user info found from user's id token received from apple");
                    }
                    let id = payload.email;
                    let isVerified = payload.email_verified;
                    if (id === undefined || id === null) {
                        throw new Error("no user info found from user's id token received from apple");
                    }
                    return {
                        id,
                        email: {
                            id,
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
            };
        });
    }
    return {
        id,
        get,
    };
}
exports.default = Apple;
//# sourceMappingURL=apple.js.map
