"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getRecipeInterface;
const recipe_1 = __importDefault(require("../accountlinking/recipe"));
const recipe_2 = __importDefault(require("../emailverification/recipe"));
const logger_1 = require("../../logger");
const user_1 = require("../../user");
const __1 = require("../..");
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const authUtils_1 = require("../../authUtils");
function getRecipeInterface(querier) {
    function copyAndRemoveUserContextAndTenantId(input) {
        let result = Object.assign({}, input);
        delete result.userContext;
        delete result.tenantId;
        delete result.session;
        if (result.recipeUserId !== undefined && result.recipeUserId.getAsString !== undefined) {
            result.recipeUserId = result.recipeUserId.getAsString();
        }
        return result;
    }
    return {
        consumeCode: async function (input) {
            const response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/signinup/code/consume",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            if (response.status !== "OK") {
                return response;
            }
            (0, logger_1.logDebugMessage)("Passwordless.consumeCode code consumed OK");
            const userAsObj = user_1.User.fromApi(response.user);
            const recipeUserIdAsObj = new recipeUserId_1.default(response.recipeUserId);
            // Attempt account linking (this is a sign up)
            let updatedUser = userAsObj;
            const linkResult =
                await authUtils_1.AuthUtils.linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo({
                    tenantId: input.tenantId,
                    inputUser: userAsObj,
                    recipeUserId: recipeUserIdAsObj,
                    session: input.session,
                    shouldTryLinkingWithSessionUser: input.shouldTryLinkingWithSessionUser,
                    userContext: input.userContext,
                });
            if (linkResult.status !== "OK") {
                return linkResult;
            }
            updatedUser = linkResult.user;
            return Object.assign(Object.assign({}, response), {
                consumedDevice: response.consumedDevice,
                createdNewRecipeUser: response.createdNewUser,
                user: updatedUser,
                recipeUserId: recipeUserIdAsObj,
            });
        },
        checkCode: async function (input) {
            let response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/signinup/code/check",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            if (response.status !== "OK") {
                return response;
            }
            (0, logger_1.logDebugMessage)("Passwordless.checkCode code verified");
            return response;
        },
        createCode: async function (input) {
            let response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/signinup/code",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response;
        },
        createNewCodeForDevice: async function (input) {
            let response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/signinup/code",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response;
        },
        listCodesByDeviceId: async function (input) {
            let response = await querier.sendGetRequest(
                {
                    path: "/<tenantId>/recipe/signinup/codes",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        listCodesByEmail: async function (input) {
            let response = await querier.sendGetRequest(
                {
                    path: "/<tenantId>/recipe/signinup/codes",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices;
        },
        listCodesByPhoneNumber: async function (input) {
            let response = await querier.sendGetRequest(
                {
                    path: "/<tenantId>/recipe/signinup/codes",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices;
        },
        listCodesByPreAuthSessionId: async function (input) {
            let response = await querier.sendGetRequest(
                {
                    path: "/<tenantId>/recipe/signinup/codes",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        revokeAllCodes: async function (input) {
            await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/signinup/codes/remove",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return {
                status: "OK",
            };
        },
        revokeCode: async function (input) {
            await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/signinup/code/remove",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return { status: "OK" };
        },
        updateUser: async function (input) {
            const accountLinking = recipe_1.default.getInstanceOrThrowError();
            if (input.email) {
                const user = await (0, __1.getUser)(input.recipeUserId.getAsString(), input.userContext);
                if (user === undefined) {
                    return { status: "UNKNOWN_USER_ID_ERROR" };
                }
                const evInstance = recipe_2.default.getInstance();
                let isEmailVerified = false;
                if (evInstance) {
                    isEmailVerified = await evInstance.recipeInterfaceImpl.isEmailVerified({
                        recipeUserId: input.recipeUserId,
                        email: input.email,
                        userContext: input.userContext,
                    });
                }
                const isEmailChangeAllowed = await accountLinking.isEmailChangeAllowed({
                    user,
                    isVerified: isEmailVerified,
                    newEmail: input.email,
                    session: undefined,
                    userContext: input.userContext,
                });
                if (!isEmailChangeAllowed.allowed) {
                    return {
                        status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                        reason:
                            isEmailChangeAllowed.reason === "ACCOUNT_TAKEOVER_RISK"
                                ? "New email cannot be applied to existing account because of account takeover risks."
                                : "New email cannot be applied to existing account because of there is another primary user with the same email address.",
                    };
                }
            }
            let response = await querier.sendPutRequest(
                "/recipe/user",
                copyAndRemoveUserContextAndTenantId(input),
                {},
                input.userContext
            );
            if (response.status !== "OK") {
                return response;
            }
            const user = await (0, __1.getUser)(input.recipeUserId.getAsString(), input.userContext);
            if (user === undefined) {
                // This means that the user was deleted between the put and get requests
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            }
            await recipe_1.default.getInstanceOrThrowError().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                user,
                recipeUserId: input.recipeUserId,
                userContext: input.userContext,
            });
            return response;
        },
    };
}
