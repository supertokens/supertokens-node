"use strict";
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k];
                  },
              });
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, "default", { enumerable: true, value: v });
          }
        : function (o, v) {
              o["default"] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
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
const jose = __importStar(require("jose"));
const implementation_1 = require("../api/implementation");
const supertokens_1 = __importDefault(require("../../../supertokens"));
const constants_1 = require("../constants");
const utils_1 = require("./utils");
function Apple(config) {
    const id = "apple";
    function getClientSecret(clientId, keyId, teamId, privateKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const alg = "ES256";
            return yield new jose.SignJWT({})
                .setProtectedHeader({ alg, kid: keyId })
                .setIssuer(teamId)
                .setIssuedAt()
                .setExpirationTime("6 months")
                .setAudience("https://appleid.apple.com")
                .setSubject(implementation_1.getActualClientIdFromDevelopmentClientId(clientId))
                .sign(yield jose.importPKCS8(privateKey, alg));
        });
    }
    // trying to generate a client secret, in case client has not passed the values correctly
    const clientSecretPromise = getClientSecret(
        config.clientId,
        config.clientSecret.keyId,
        config.clientSecret.teamId,
        config.clientSecret.privateKey
    );
    function get(redirectURI, authCodeFromRequest) {
        return __awaiter(this, void 0, void 0, function* () {
            let accessTokenAPIURL = "https://appleid.apple.com/auth/token";
            let accessTokenAPIParams = {
                client_id: config.clientId,
                client_secret: yield clientSecretPromise,
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
                    /*
                    - Verify the JWS E256 signature using the server’s public key
                    - Verify the nonce for the authentication
                    - Verify that the iss field contains https://appleid.apple.com
                    - Verify that the aud field is the developer’s client_id
                    - Verify that the time is earlier than the exp value of the token */
                    const payload = yield utils_1.verifyIdTokenFromJWKSEndpoint(
                        accessTokenAPIResponse.id_token,
                        "https://appleid.apple.com/auth/keys",
                        {
                            issuer: "https://appleid.apple.com",
                            audience: implementation_1.getActualClientIdFromDevelopmentClientId(config.clientId),
                        }
                    );
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
        });
    }
    return {
        id,
        get,
        isDefault: config.isDefault,
    };
}
exports.default = Apple;
