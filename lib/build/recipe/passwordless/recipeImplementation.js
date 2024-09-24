"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../accountlinking/recipe"));
const recipe_2 = __importDefault(require("../emailverification/recipe"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
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
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code/consume`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            if (response.status !== "OK") {
                return response;
            }
            logger_1.logDebugMessage("Passwordless.consumeCode code consumed OK");
            response.user = new user_1.User(response.user);
            response.recipeUserId = new recipeUserId_1.default(response.recipeUserId);
            // Attempt account linking (this is a sign up)
            let updatedUser = response.user;
            const linkResult = await authUtils_1.AuthUtils.linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo(
                {
                    tenantId: input.tenantId,
                    inputUser: response.user,
                    recipeUserId: response.recipeUserId,
                    session: input.session,
                    shouldTryLinkingWithSessionUser: input.shouldTryLinkingWithSessionUser,
                    userContext: input.userContext,
                }
            );
            if (linkResult.status !== "OK") {
                return linkResult;
            }
            updatedUser = linkResult.user;
            response.user = updatedUser;
            return Object.assign(Object.assign({}, response), {
                consumedDevice: response.consumedDevice,
                createdNewRecipeUser: response.createdNewUser,
                user: response.user,
                recipeUserId: response.recipeUserId,
            });
        },
        checkCode: async function (input) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code/check`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            if (response.status !== "OK") {
                return response;
            }
            logger_1.logDebugMessage("Passwordless.checkCode code verified");
            return response;
        },
        createCode: async function (input) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response;
        },
        createNewCodeForDevice: async function (input) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response;
        },
        listCodesByDeviceId: async function (input) {
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        listCodesByEmail: async function (input) {
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices;
        },
        listCodesByPhoneNumber: async function (input) {
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices;
        },
        listCodesByPreAuthSessionId: async function (input) {
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        revokeAllCodes: async function (input) {
            await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes/remove`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return {
                status: "OK",
            };
        },
        revokeCode: async function (input) {
            await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code/remove`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return { status: "OK" };
        },
        updateUser: async function (input) {
            const accountLinking = recipe_1.default.getInstance();
            if (input.email) {
                const user = await __1.getUser(input.recipeUserId.getAsString(), input.userContext);
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
                new normalisedURLPath_1.default(`/recipe/user`),
                copyAndRemoveUserContextAndTenantId(input),
                {},
                input.userContext
            );
            if (response.status !== "OK") {
                return response;
            }
            const user = await __1.getUser(input.recipeUserId.getAsString(), input.userContext);
            if (user === undefined) {
                // This means that the user was deleted between the put and get requests
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            }
            await recipe_1.default.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                user,
                recipeUserId: input.recipeUserId,
                userContext: input.userContext,
            });
            return response;
        },
    };
}
exports.default = getRecipeInterface;
