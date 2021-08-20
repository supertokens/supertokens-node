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
const url_1 = require("url");
const axios = require("axios");
const qs = require("querystring");
class APIImplementation {
    constructor() {
        this.authorisationUrlGET = ({ provider, options }) =>
            __awaiter(this, void 0, void 0, function* () {
                let providerInfo = yield provider.get(undefined, undefined);
                let params = {};
                let keys = Object.keys(providerInfo.authorisationRedirect.params);
                for (let i = 0; i < keys.length; i++) {
                    let key = keys[i];
                    let value = providerInfo.authorisationRedirect.params[key];
                    params[key] = typeof value === "function" ? yield value(options.req.original) : value;
                }
                let paramsString = new url_1.URLSearchParams(params).toString();
                let url = `${providerInfo.authorisationRedirect.url}?${paramsString}`;
                return {
                    status: "OK",
                    url,
                };
            });
        this.signInUpPOST = ({ provider, code, redirectURI, options }) =>
            __awaiter(this, void 0, void 0, function* () {
                let userInfo;
                let accessTokenAPIResponse;
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
                let emailInfo = userInfo.email;
                if (emailInfo === undefined) {
                    return {
                        status: "NO_EMAIL_GIVEN_BY_PROVIDER",
                    };
                }
                let response = yield options.recipeImplementation.signInUp({
                    thirdPartyId: provider.id,
                    thirdPartyUserId: userInfo.id,
                    email: emailInfo,
                });
                if (response.status === "FIELD_ERROR") {
                    return response;
                }
                let action = response.createdNewUser ? "signup" : "signin";
                let jwtPayloadPromise = options.config.sessionFeature.setJwtPayload(
                    response.user,
                    accessTokenAPIResponse.data,
                    action
                );
                let sessionDataPromise = options.config.sessionFeature.setSessionData(
                    response.user,
                    accessTokenAPIResponse.data,
                    action
                );
                let jwtPayload = yield jwtPayloadPromise;
                let sessionData = yield sessionDataPromise;
                yield session_1.default.createNewSession(options.res, response.user.id, jwtPayload, sessionData);
                return {
                    status: "OK",
                    createdNewUser: response.createdNewUser,
                    user: response.user,
                    authCodeResponse: accessTokenAPIResponse.data,
                };
            });
    }
}
exports.default = APIImplementation;
//# sourceMappingURL=implementation.js.map
