"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../accountlinking/recipe"));
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
            var _a;
            let response;
            if (
                mockVerifyCode &&
                verifyResponseCache[JSON.stringify(copyAndRemoveUserContextAndTenantId(input))] !== undefined
            ) {
                response = verifyResponseCache[JSON.stringify(copyAndRemoveUserContextAndTenantId(input))];
                const email = response.consumedDevice.email;
                const phoneNumber = response.consumedDevice.phoneNumber;
                const users = await __1.listUsersByAccountInfo(input.tenantId, {
                    email,
                    phoneNumber,
                });
                const user = users.find((u) =>
                    u.loginMethods.some(
                        (lm) =>
                            lm.recipeId === "passwordless" &&
                            (lm.hasSameEmailAs(email) || lm.hasSamePhoneNumberAs(phoneNumber))
                    )
                );
                if (user !== undefined) {
                    response.user = user.toJson();
                    response.recipeUserId =
                        (_a = user.loginMethods.find(
                            (lm) =>
                                lm.recipeId === "passwordless" &&
                                (lm.hasSameEmailAs(email) || lm.hasSamePhoneNumberAs(phoneNumber))
                        )) === null || _a === void 0
                            ? void 0
                            : _a.recipeUserId.getAsString();
                    response.createdNewUser = false;
                }
            } else {
                response = await querier.sendPostRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code/consume`),
                    copyAndRemoveUserContextAndTenantId(input),
                    input.userContext
                );
            }
            if (response.status !== "OK") {
                return response;
            }
            logger_1.logDebugMessage("Passwordless.consumeCode code consumed OK");
            response.user = new user_1.User(response.user);
            response.recipeUserId = new recipeUserId_1.default(response.recipeUserId);
            if (response.status !== "OK") {
                return response;
            }
            if (response.createdNewUser !== true) {
                // Unlike in the sign up scenario, we do not do account linking here
                // cause we do not want sign in to change the potentially user ID of a user
                // due to linking when this function is called by the dev in their API.
                // If we did account linking
                // then we would have to ask the dev to also change the session
                // in such API calls.
                // In the case of sign up, since we are creating a new user, it's fine
                // to link there since there is no user id change really from the dev's
                // point of view who is calling the sign up recipe function.
                return {
                    status: "OK",
                    createdNewRecipeUser: false,
                    recipeUserId: response.recipeUserId,
                    user: response.user,
                    consumedDevice: response.consumedDevice,
                };
            }
            if (response.status !== "OK") {
                return response;
            }
            // This is just to make TS happy, the createdNewUser check should cover this already
            if (response.recipeUserId === undefined || response.user === undefined) {
                throw new Error("This should never happen: no user in consumeCode response with deleteCode=true");
            }
            // Attempt account linking (this is a sign up)
            let updatedUser = response.user;
            const linkResult = await authUtils_1.AuthUtils.linkToSessionIfProvidedElseCreatePrimaryUserIdOrLinkByAccountInfo(
                {
                    tenantId: input.tenantId,
                    inputUser: response.user,
                    recipeUserId: response.recipeUserId,
                    session: input.session,
                    userContext: input.userContext,
                }
            );
            if (linkResult.status !== "OK") {
                return linkResult;
            }
            updatedUser = linkResult.user;
            if (updatedUser === undefined) {
                throw new Error("Should never come here.");
            }
            response.user = updatedUser;
            return Object.assign(Object.assign({}, response), {
                consumedDevice: response.consumedDevice,
                createdNewRecipeUser: true,
                user: response.user,
                recipeUserId: response.recipeUserId,
            });
        },
        verifyCode: async function (input) {
            if (mockVerifyCode) {
                delete input.deleteCode;
                if (verifyResponseCache[JSON.stringify(copyAndRemoveUserContextAndTenantId(input))] !== undefined) {
                    return verifyResponseCache[JSON.stringify(copyAndRemoveUserContextAndTenantId(input))];
                }
                const response = await querier.sendPostRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code/consume`),
                    copyAndRemoveUserContextAndTenantId(
                        Object.assign(Object.assign({}, input), { createRecipeUserIfNotExists: false })
                    ),
                    input.userContext
                );
                if (response.status === "OK") {
                    verifyResponseCache[JSON.stringify(copyAndRemoveUserContextAndTenantId(input))] = response;
                }
                return response;
            }
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code/verify`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            if (response.status !== "OK") {
                return response;
            }
            logger_1.logDebugMessage("Passwordless.verifyCode code verified");
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
            let response = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/user`),
                copyAndRemoveUserContextAndTenantId(input),
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
const mockVerifyCode = true;
const verifyResponseCache = {};
