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
const session_1 = __importDefault(require("../../session"));
const recipe_1 = __importDefault(require("../../emailverification/recipe"));
function getAPIInterface() {
    return {
        authorisationUrlGET: function ({ provider, redirectURIOnProviderDashboard, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const authUrl = yield provider.getAuthorisationRedirectURL({
                    redirectURIOnProviderDashboard,
                    userContext,
                });
                return Object.assign({ status: "OK" }, authUrl);
            });
        },
        signInUpPOST: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const { provider, options, userContext } = input;
                let oAuthTokensToUse = {};
                if ("redirectURIInfo" in input && input.redirectURIInfo !== undefined) {
                    oAuthTokensToUse = yield provider.exchangeAuthCodeForOAuthTokens({
                        redirectURIInfo: input.redirectURIInfo,
                        userContext,
                    });
                } else if ("oAuthTokens" in input && input.oAuthTokens !== undefined) {
                    oAuthTokensToUse = input.oAuthTokens;
                } else {
                    throw Error("should never come here");
                }
                const userInfo = yield provider.getUserInfo({ oAuthTokens: oAuthTokensToUse, userContext });
                if (userInfo.email === undefined && provider.config.requireEmail === false) {
                    userInfo.email = {
                        id: yield provider.config.generateFakeEmail({
                            thirdPartyUserId: userInfo.thirdPartyUserId,
                            userContext,
                        }),
                        isVerified: true,
                    };
                }
                let emailInfo = userInfo.email;
                if (emailInfo === undefined) {
                    return {
                        status: "NO_EMAIL_GIVEN_BY_PROVIDER",
                    };
                }
                let response = yield options.recipeImplementation.signInUp({
                    thirdPartyId: provider.id,
                    thirdPartyUserId: userInfo.thirdPartyUserId,
                    email: emailInfo.id,
                    oAuthTokens: oAuthTokensToUse,
                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                    userContext,
                });
                // we set the email as verified if already verified by the OAuth provider.
                // This block was added because of https://github.com/supertokens/supertokens-core/issues/295
                if (emailInfo.isVerified) {
                    const emailVerificationInstance = recipe_1.default.getInstance();
                    if (emailVerificationInstance) {
                        const tokenResponse = yield emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                            {
                                userId: response.user.id,
                                email: response.user.email,
                                userContext,
                            }
                        );
                        if (tokenResponse.status === "OK") {
                            yield emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                                token: tokenResponse.token,
                                userContext,
                            });
                        }
                    }
                }
                let session = yield session_1.default.createNewSession(
                    options.req,
                    options.res,
                    response.user.id,
                    {},
                    {},
                    userContext
                );
                return {
                    status: "OK",
                    createdNewUser: response.createdNewUser,
                    user: response.user,
                    session,
                    oAuthTokens: oAuthTokensToUse,
                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                };
            });
        },
        appleRedirectHandlerPOST: function ({ formPostInfoFromProvider, options }) {
            return __awaiter(this, void 0, void 0, function* () {
                const stateInBase64 = formPostInfoFromProvider.state;
                const state = Buffer.from(stateInBase64, "base64").toString();
                const stateObj = JSON.parse(state);
                const redirectURI = stateObj.redirectURI;
                const urlObj = new URL(redirectURI);
                for (const [key, value] of Object.entries(formPostInfoFromProvider)) {
                    urlObj.searchParams.set(key, `${value}`);
                }
                options.res.setHeader("Location", urlObj.toString(), false);
                options.res.setStatusCode(303);
                options.res.sendHTMLResponse("");
            });
        },
    };
}
exports.default = getAPIInterface;
