"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../accountlinking/recipe"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const recipe_2 = __importDefault(require("../emailverification/recipe"));
const logger_1 = require("../../logger");
const user_1 = require("../../user");
const __1 = require("../..");
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
function getRecipeInterface(querier) {
    function copyAndRemoveUserContextAndTenantId(input) {
        let result = Object.assign({}, input);
        delete result.userContext;
        delete result.tenantId;
        if (result.recipeUserId !== undefined && result.recipeUserId.getAsString !== undefined) {
            result.recipeUserId = result.recipeUserId.getAsString();
        }
        return result;
    }
    return {
        consumeCode: async function (input) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code/consume`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            if (response.status !== "OK") {
                return response;
            }
            logger_1.logDebugMessage("Passwordless.consumeCode code consumed OK");
            response.user = new user_1.User(response.user);
            response.recipeUserId = new recipeUserId_1.default(response.recipeUserId);
            const loginMethod = response.user.loginMethods.find(
                (lm) => lm.recipeUserId.getAsString() === response.recipeUserId.getAsString()
            );
            if (loginMethod === undefined) {
                throw new Error("This should never happen: login method not found after signin");
            }
            if (loginMethod.email !== undefined) {
                logger_1.logDebugMessage("Passwordless.consumeCode checking if email verification is initialized");
                const emailVerificationInstance = recipe_2.default.getInstance();
                if (emailVerificationInstance) {
                    logger_1.logDebugMessage("Passwordless.consumeCode checking email verification status");
                    const tokenResponse = await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                        {
                            tenantId: input.tenantId,
                            recipeUserId: loginMethod.recipeUserId,
                            email: loginMethod.email,
                            userContext: input.userContext,
                        }
                    );
                    if (tokenResponse.status === "OK") {
                        logger_1.logDebugMessage("Passwordless.consumeCode verifying email address");
                        await emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                            tenantId: input.tenantId,
                            token: tokenResponse.token,
                            attemptAccountLinking: false,
                            userContext: input.userContext,
                        });
                        // we do this so that we get the updated user (in case the above
                        // function updated the verification status) and can return that
                        response.user = await __1.getUser(loginMethod.recipeUserId.getAsString(), input.userContext);
                    }
                }
            }
            if (!response.createdNewRecipeUser) {
                // Unlike in the sign up scenario, we do not do account linking here
                // cause we do not want sign in to change the potentially user ID of a user
                // due to linking when this function is called by the dev in their API.
                // If we did account linking
                // then we would have to ask the dev to also change the session
                // in such API calls.
                // In the case of sign up, since we are creating a new user, it's fine
                // to link there since there is no user id change really from the dev's
                // point of view who is calling the sign up recipe function.
                return response;
            }
            let updatedUser = await recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                tenantId: input.tenantId,
                user: response.user,
                userContext: input.userContext,
            });
            if (updatedUser === undefined) {
                throw new Error("Should never come here.");
            }
            return {
                status: "OK",
                createdNewRecipeUser: response.createdNewRecipeUser,
                user: updatedUser,
            };
        },
        createCode: async function (input) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response;
        },
        createNewCodeForDevice: async function (input) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response;
        },
        listCodesByDeviceId: async function (input) {
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        listCodesByEmail: async function (input) {
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response.devices;
        },
        listCodesByPhoneNumber: async function (input) {
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response.devices;
        },
        listCodesByPreAuthSessionId: async function (input) {
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        revokeAllCodes: async function (input) {
            await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes/remove`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return {
                status: "OK",
            };
        },
        revokeCode: async function (input) {
            await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code/remove`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return { status: "OK" };
        },
        updateUser: async function (input) {
            let response = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/user`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            const user = await __1.getUser(input.recipeUserId.getAsString(), input.userContext);
            if (user === undefined) {
                // This means that the user was deleted between the put and get requests
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            }
            await recipe_1.default.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                tenantId: input.tenantId,
                user,
                recipeUserId: input.recipeUserId,
                userContext: input.userContext,
            });
            return response;
        },
    };
}
exports.default = getRecipeInterface;
