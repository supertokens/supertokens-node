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
class APIImplementation {
    constructor(recipeInstance) {
        this.emailExistsGET = (email, options) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield options.recipeImplementation.getUserByEmail(email);
                return {
                    status: "OK",
                    exists: user !== undefined,
                };
            });
        this.generatePasswordResetTokenPOST = (formFields, options) =>
            __awaiter(this, void 0, void 0, function* () {
                let email = formFields.filter((f) => f.id === "email")[0].value;
                let user = yield options.recipeImplementation.getUserByEmail(email);
                if (user === undefined) {
                    return {
                        status: "OK",
                    };
                }
                let token;
                try {
                    token = yield options.recipeImplementation.createResetPasswordToken(user.id);
                } catch (err) {
                    if (
                        error_1.default.isErrorFromSuperTokens(err) &&
                        err.type === error_1.default.UNKNOWN_USER_ID_ERROR
                    ) {
                        return {
                            status: "OK",
                        };
                    }
                    throw err;
                }
                let passwordResetLink =
                    (yield this.recipeInstance.config.resetPasswordUsingTokenFeature.getResetPasswordURL(user)) +
                    "?token=" +
                    token +
                    "&rid=" +
                    this.recipeInstance.getRecipeId();
                this.recipeInstance.config.resetPasswordUsingTokenFeature
                    .createAndSendCustomEmail(user, passwordResetLink)
                    .catch((_) => {});
                return {
                    status: "OK",
                };
            });
        this.passwordResetPOST = (formFields, token, options) =>
            __awaiter(this, void 0, void 0, function* () {
                let newPassword = formFields.filter((f) => f.id === "password")[0].value;
                yield options.recipeImplementation.resetPasswordUsingToken(token, newPassword);
                // step 3
                return {
                    status: "OK",
                };
            });
        this.signInPOST = (formFields, options) =>
            __awaiter(this, void 0, void 0, function* () {
                let email = formFields.filter((f) => f.id === "email")[0].value;
                let password = formFields.filter((f) => f.id === "password")[0].value;
                let user = yield options.recipeImplementation.signIn(email, password);
                yield this.recipeInstance.config.signInFeature.handlePostSignIn(user);
                let jwtPayloadPromise = this.recipeInstance.config.sessionFeature.setJwtPayload(
                    user,
                    formFields,
                    "signin"
                );
                let sessionDataPromise = this.recipeInstance.config.sessionFeature.setSessionData(
                    user,
                    formFields,
                    "signin"
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
                yield session_1.default.createNewSession(options.res, user.id, jwtPayload, sessionData);
                return {
                    status: "OK",
                    user,
                };
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
        this.signUpPOST = (formFields, options) =>
            __awaiter(this, void 0, void 0, function* () {
                let email = formFields.filter((f) => f.id === "email")[0].value;
                let password = formFields.filter((f) => f.id === "password")[0].value;
                let user = yield options.recipeImplementation.signUp(email, password);
                yield this.recipeInstance.config.signUpFeature.handlePostSignUp(user, formFields);
                let jwtPayloadPromise = this.recipeInstance.config.sessionFeature.setJwtPayload(
                    user,
                    formFields,
                    "signup"
                );
                let sessionDataPromise = this.recipeInstance.config.sessionFeature.setSessionData(
                    user,
                    formFields,
                    "signup"
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
                yield session_1.default.createNewSession(options.res, user.id, jwtPayload, sessionData);
                return {
                    status: "OK",
                    user,
                };
            });
        this.recipeInstance = recipeInstance;
    }
}
exports.default = APIImplementation;
//# sourceMappingURL=implementation.js.map
