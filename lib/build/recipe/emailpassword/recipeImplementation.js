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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const constants_1 = require("./constants");
const constants_2 = require("../multitenancy/constants");
function getRecipeInterface(querier, getEmailPasswordConfig) {
    return {
        signUp: function ({ email, password, tenantId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default(
                        `/${tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : tenantId}/recipe/signup`
                    ),
                    {
                        email,
                        password,
                    }
                );
                if (response.status === "OK") {
                    return response;
                } else {
                    return {
                        status: "EMAIL_ALREADY_EXISTS_ERROR",
                    };
                }
            });
        },
        signIn: function ({ email, password, tenantId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default(
                        `/${tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : tenantId}/recipe/signin`
                    ),
                    {
                        email,
                        password,
                    }
                );
                if (response.status === "OK") {
                    return response;
                } else {
                    return {
                        status: "WRONG_CREDENTIALS_ERROR",
                    };
                }
            });
        },
        getUserById: function ({ userId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    userId,
                });
                if (response.status === "OK") {
                    return Object.assign({}, response.user);
                } else {
                    return undefined;
                }
            });
        },
        getUserByEmail: function ({ email, tenantId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default(
                        `/${tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : tenantId}/recipe/user`
                    ),
                    {
                        email,
                    }
                );
                if (response.status === "OK") {
                    return Object.assign({}, response.user);
                } else {
                    return undefined;
                }
            });
        },
        createResetPasswordToken: function ({ userId, tenantId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default(
                        `/${
                            tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : tenantId
                        }/recipe/user/password/reset/token`
                    ),
                    {
                        userId,
                    }
                );
                if (response.status === "OK") {
                    return {
                        status: "OK",
                        token: response.token,
                    };
                } else {
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                }
            });
        },
        resetPasswordUsingToken: function ({ token, newPassword, tenantId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default(
                        `/${
                            tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : tenantId
                        }/recipe/user/password/reset`
                    ),
                    {
                        method: "token",
                        token,
                        newPassword,
                    }
                );
                return response;
            });
        },
        updateEmailOrPassword: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                if (input.applyPasswordPolicy || input.applyPasswordPolicy === undefined) {
                    let formFields = getEmailPasswordConfig().signUpFeature.formFields;
                    if (input.password !== undefined) {
                        const passwordField = formFields.filter(
                            (el) => el.id === constants_1.FORM_FIELD_PASSWORD_ID
                        )[0];
                        const error = yield passwordField.validate(input.password);
                        if (error !== undefined) {
                            return {
                                status: "PASSWORD_POLICY_VIOLATED_ERROR",
                                failureReason: error,
                            };
                        }
                    }
                }
                let response = yield querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    userId: input.userId,
                    email: input.email,
                    password: input.password,
                });
                if (response.status === "OK") {
                    return {
                        status: "OK",
                    };
                } else if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                    return {
                        status: "EMAIL_ALREADY_EXISTS_ERROR",
                    };
                } else {
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                }
            });
        },
    };
}
exports.default = getRecipeInterface;
