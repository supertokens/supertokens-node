"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const mockCore_1 = require("./mockCore");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const recipe_1 = __importDefault(require("../emailverification/recipe"));
const logger_1 = require("../../logger");
const user_1 = require("../../user");
const __1 = require("../..");
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
            let response;
            if (process.env.MOCK !== "true") {
                response = await querier.sendPostRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code/consume`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockCore_1.mockConsumeCode(input);
            }
            if (response.status === "OK") {
                logger_1.logDebugMessage("Passwordless.consumeCode code consumed OK");
                response.user = new user_1.User(response.user);
                const loginMethod = response.user.loginMethods.find((m) => m.recipeId === "passwordless");
                if (loginMethod === undefined) {
                    throw new Error("This should never happen: login method not found after signin");
                }
                if (loginMethod.email !== undefined) {
                    logger_1.logDebugMessage("Passwordless.consumeCode checking if email verification is initialized");
                    const emailVerificationInstance = recipe_1.default.getInstance();
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
                            response.user = await __1.getUser(
                                loginMethod.recipeUserId.getAsString(),
                                input.userContext
                            );
                        }
                    }
                }
            }
            return response;
        },
        createCode: async function (input) {
            let response;
            if (process.env.MOCK !== "true") {
                response = await querier.sendPostRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockCore_1.mockCreateCode(input);
            }
            return response;
        },
        createNewCodeForDevice: async function (input) {
            let response;
            if (process.env.MOCK !== "true") {
                response = await querier.sendPostRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockCore_1.mockCreateNewCodeForDevice(input);
            }
            return response;
        },
        listCodesByDeviceId: async function (input) {
            let response;
            if (process.env.MOCK !== "true") {
                response = await querier.sendGetRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockCore_1.mockListCodesByDeviceId(input);
            }
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        listCodesByEmail: async function (input) {
            let response;
            if (process.env.MOCK !== "true") {
                response = await querier.sendGetRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockCore_1.mockListCodesByEmail(input);
            }
            return response.devices;
        },
        listCodesByPhoneNumber: async function (input) {
            let response;
            if (process.env.MOCK !== "true") {
                response = await querier.sendGetRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockCore_1.mockListCodesByPhoneNumber(input);
            }
            return response.devices;
        },
        listCodesByPreAuthSessionId: async function (input) {
            let response;
            if (process.env.MOCK !== "true") {
                response = await querier.sendGetRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockCore_1.mockListCodesByPreAuthSessionId(input);
            }
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        revokeAllCodes: async function (input) {
            if (process.env.MOCK !== "true") {
                await querier.sendPostRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes/remove`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                await mockCore_1.mockRevokeAllCodes(input);
            }
            return {
                status: "OK",
            };
        },
        revokeCode: async function (input) {
            if (process.env.MOCK !== "true") {
                await querier.sendPostRequest(
                    new normalisedURLPath_1.default(`${input.tenantId}/recipe/signinup/code/remove`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                await mockCore_1.mockRevokeCode(input);
            }
            return { status: "OK" };
        },
        updateUser: async function (input) {
            let response;
            if (process.env.MOCK !== "true") {
                response = await querier.sendPutRequest(
                    new normalisedURLPath_1.default(`${input.tenantId}/recipe/user`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockCore_1.mockUpdateUser(input);
            }
            return response;
        },
    };
}
exports.default = getRecipeInterface;
