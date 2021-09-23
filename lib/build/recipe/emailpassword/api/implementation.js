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
class APIImplementation {
    constructor() {
        this.emailExistsGET = ({ email, options }) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield options.recipeImplementation.getUserByEmail({ email });
                return {
                    status: "OK",
                    exists: user !== undefined,
                };
            });
        this.generatePasswordResetTokenPOST = ({ formFields, options }) =>
            __awaiter(this, void 0, void 0, function* () {
                let email = formFields.filter((f) => f.id === "email")[0].value;
                let user = yield options.recipeImplementation.getUserByEmail({ email });
                if (user === undefined) {
                    return {
                        status: "OK",
                    };
                }
                let response = yield options.recipeImplementation.createResetPasswordToken({ userId: user.id });
                if (response.status === "UNKNOWN_USER_ID_ERROR") {
                    return {
                        status: "OK",
                    };
                }
                let passwordResetLink =
                    (yield options.config.resetPasswordUsingTokenFeature.getResetPasswordURL(user)) +
                    "?token=" +
                    response.token +
                    "&rid=" +
                    options.recipeId;
                try {
                    if (!options.isInServerlessEnv) {
                        options.config.resetPasswordUsingTokenFeature
                            .createAndSendCustomEmail(user, passwordResetLink)
                            .catch((_) => {});
                    } else {
                        // see https://github.com/supertokens/supertokens-node/pull/135
                        yield options.config.resetPasswordUsingTokenFeature.createAndSendCustomEmail(
                            user,
                            passwordResetLink
                        );
                    }
                } catch (_) {}
                return {
                    status: "OK",
                };
            });
        this.passwordResetPOST = ({ formFields, token, options }) =>
            __awaiter(this, void 0, void 0, function* () {
                let newPassword = formFields.filter((f) => f.id === "password")[0].value;
                let response = yield options.recipeImplementation.resetPasswordUsingToken({ token, newPassword });
                return response;
            });
        this.signInPOST = ({ formFields, options }) =>
            __awaiter(this, void 0, void 0, function* () {
                let email = formFields.filter((f) => f.id === "email")[0].value;
                let password = formFields.filter((f) => f.id === "password")[0].value;
                let response = yield options.recipeImplementation.signIn({ email, password });
                if (response.status === "WRONG_CREDENTIALS_ERROR") {
                    return response;
                }
                let user = response.user;
                let jwtPayloadPromise = options.config.sessionFeature.setJwtPayload(user, formFields, "signin");
                let sessionDataPromise = options.config.sessionFeature.setSessionData(user, formFields, "signin");
                let jwtPayload = yield jwtPayloadPromise;
                let sessionData = yield sessionDataPromise;
                yield session_1.default.createNewSession(options.res, user.id, jwtPayload, sessionData);
                return {
                    status: "OK",
                    user,
                };
            });
        this.signUpPOST = ({ formFields, options }) =>
            __awaiter(this, void 0, void 0, function* () {
                let email = formFields.filter((f) => f.id === "email")[0].value;
                let password = formFields.filter((f) => f.id === "password")[0].value;
                let response = yield options.recipeImplementation.signUp({ email, password });
                if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                    return response;
                }
                let user = response.user;
                let jwtPayloadPromise = options.config.sessionFeature.setJwtPayload(user, formFields, "signup");
                let sessionDataPromise = options.config.sessionFeature.setSessionData(user, formFields, "signup");
                let jwtPayload = yield jwtPayloadPromise;
                let sessionData = yield sessionDataPromise;
                yield session_1.default.createNewSession(options.res, user.id, jwtPayload, sessionData);
                return {
                    status: "OK",
                    user,
                };
            });
    }
}
exports.default = APIImplementation;
