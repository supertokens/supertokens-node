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
const session_1 = require("../../session");
const error_1 = require("../error");
const url_1 = require("url");
const axios = require("axios");
const qs = require("querystring");
class APIImplementation {
    constructor(recipeInstance) {
        this.authorisationUrlGET = (provider, options) =>
            __awaiter(this, void 0, void 0, function* () {
                let providerInfo;
                try {
                    providerInfo = yield provider.get(undefined, undefined);
                } catch (err) {
                    throw new error_1.default(
                        {
                            type: "GENERAL_ERROR",
                            payload: err,
                        },
                        this.recipeInstance
                    );
                }
                const params = Object.entries(providerInfo.authorisationRedirect.params).reduce(
                    (acc, [key, value]) =>
                        Object.assign(Object.assign({}, acc), {
                            [key]: typeof value === "function" ? value(options.req) : value,
                        }),
                    {}
                );
                let paramsString = new url_1.URLSearchParams(params).toString();
                let url = `${providerInfo.authorisationRedirect.url}?${paramsString}`;
                return {
                    status: "OK",
                    url,
                };
            });
        this.signInUpPOST = (provider, code, redirectURI, options) =>
            __awaiter(this, void 0, void 0, function* () {
                let userInfo;
                let accessTokenAPIResponse;
                try {
                    let providerInfo = yield provider.get(redirectURI, code);
                    accessTokenAPIResponse = yield axios.default({
                        method: "post",
                        url: providerInfo.accessTokenAPI.url,
                        data: qs.stringify(providerInfo.accessTokenAPI.params),
                        headers: {
                            "content-type": "application/x-www-form-urlencoded",
                            accept: "application/json",
                        },
                    });
                    userInfo = yield providerInfo.getProfileInfo(accessTokenAPIResponse.data);
                } catch (err) {
                    throw new error_1.default(
                        {
                            type: "GENERAL_ERROR",
                            payload: err,
                        },
                        this.recipeInstance
                    );
                }
                let emailInfo = userInfo.email;
                if (emailInfo === undefined) {
                    throw new error_1.default(
                        {
                            type: "NO_EMAIL_GIVEN_BY_PROVIDER",
                            message: `Provider ${provider.id} returned no email info for the user.`,
                        },
                        this.recipeInstance
                    );
                }
                let user = yield options.recipeImplementation.signInUp(provider.id, userInfo.id, emailInfo);
                yield this.recipeInstance.config.signInAndUpFeature.handlePostSignUpIn(
                    user.user,
                    accessTokenAPIResponse.data,
                    user.createdNewUser
                );
                let action = user.createdNewUser ? "signup" : "signin";
                let jwtPayloadPromise = this.recipeInstance.config.sessionFeature.setJwtPayload(
                    user.user,
                    accessTokenAPIResponse.data,
                    action
                );
                let sessionDataPromise = this.recipeInstance.config.sessionFeature.setSessionData(
                    user.user,
                    accessTokenAPIResponse.data,
                    action
                );
                let jwtPayload = undefined;
                let sessionData = undefined;
                try {
                    jwtPayload = yield jwtPayloadPromise;
                    sessionData = yield sessionDataPromise;
                } catch (err) {
                    throw new error_1.default(
                        {
                            type: error_1.default.GENERAL_ERROR,
                            payload: err,
                        },
                        this.recipeInstance
                    );
                }
                yield session_1.default.createNewSession(options.res, user.user.id, jwtPayload, sessionData);
                return Object.assign({ status: "OK" }, user);
            });
        this.signOutPOST = (options) =>
            __awaiter(this, void 0, void 0, function* () {
                let session;
                try {
                    session = yield session_1.default.getSession(options.req, options.res);
                } catch (err) {
                    if (
                        session_1.default.Error.isErrorFromSuperTokens(err) &&
                        err.type === session_1.default.Error.UNAUTHORISED
                    ) {
                        // The session is expired / does not exist anyway. So we return OK
                        return {
                            status: "OK",
                        };
                    }
                    throw err;
                }
                if (session === undefined) {
                    throw new session_1.default.Error(
                        {
                            type: session_1.default.Error.GENERAL_ERROR,
                            payload: new Error("Session is undefined. Should not come here."),
                        },
                        this.recipeInstance
                    );
                }
                yield session.revokeSession();
                return {
                    status: "OK",
                };
            });
        this.recipeInstance = recipeInstance;
    }
}
exports.default = APIImplementation;
//# sourceMappingURL=implementation.js.map
