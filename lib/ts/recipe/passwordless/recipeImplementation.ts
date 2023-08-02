import { RecipeInterface } from "./types";
import { Querier } from "../../querier";
import {
    mockConsumeCode,
    mockCreateCode,
    mockCreateNewCodeForDevice,
    mockListCodesByDeviceId,
    mockListCodesByEmail,
    mockListCodesByPhoneNumber,
    mockListCodesByPreAuthSessionId,
    mockUpdateUser,
    mockRevokeAllCodes,
    mockRevokeCode,
} from "./mockCore";
import NormalisedURLPath from "../../normalisedURLPath";
import EmailVerification from "../emailverification/recipe";
import { User } from "../../types";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    function copyAndRemoveUserContextAndTenantId(input: any): any {
        let result = {
            ...input,
        };
        delete result.userContext;
        delete result.tenantId;
        return result;
    }

    return {
        consumeCode: async function (input) {
            let response;

            if (process.env.MOCK !== "true") {
                response = await querier.sendPostRequest(
                    new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/code/consume`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockConsumeCode(input);
            }
            if (response.status === "OK") {
                const loginMethod = response.user.loginMethods.find(
                    (m: User["loginMethods"][number]) => m.recipeId === "passwordless"
                )!;
                if (loginMethod === undefined) {
                    throw new Error("This should never happen: login method not found after signin");
                }
                if (loginMethod.email !== undefined) {
                    const emailVerificationInstance = EmailVerification.getInstance();
                    if (emailVerificationInstance) {
                        const tokenResponse = await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                            {
                                tenantId: input.tenantId,
                                recipeUserId: loginMethod.recipeUserId,
                                email: loginMethod.email,
                                userContext: input.userContext,
                            }
                        );

                        if (tokenResponse.status === "OK") {
                            await emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                                tenantId: input.tenantId,
                                token: tokenResponse.token,
                                attemptAccountLinking: false,
                                userContext: input.userContext,
                            });
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
                    new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/code`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockCreateCode(input);
            }
            return response;
        },
        createNewCodeForDevice: async function (input) {
            let response;

            if (process.env.MOCK !== "true") {
                response = await querier.sendPostRequest(
                    new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/code`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockCreateNewCodeForDevice(input);
            }
            return response;
        },
        listCodesByDeviceId: async function (input) {
            let response;

            if (process.env.MOCK !== "true") {
                response = await querier.sendGetRequest(
                    new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockListCodesByDeviceId(input);
            }
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        listCodesByEmail: async function (input) {
            let response;

            if (process.env.MOCK !== "true") {
                response = await querier.sendGetRequest(
                    new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockListCodesByEmail(input);
            }
            return response.devices;
        },
        listCodesByPhoneNumber: async function (input) {
            let response;

            if (process.env.MOCK !== "true") {
                response = await querier.sendGetRequest(
                    new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockListCodesByPhoneNumber(input);
            }
            return response.devices;
        },
        listCodesByPreAuthSessionId: async function (input) {
            let response;

            if (process.env.MOCK !== "true") {
                response = await querier.sendGetRequest(
                    new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockListCodesByPreAuthSessionId(input);
            }
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        revokeAllCodes: async function (input) {
            if (process.env.MOCK !== "true") {
                await querier.sendPostRequest(
                    new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes/remove`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                await mockRevokeAllCodes(input);
            }
            return {
                status: "OK",
            };
        },
        revokeCode: async function (input) {
            if (process.env.MOCK !== "true") {
                await querier.sendPostRequest(
                    new NormalisedURLPath(`${input.tenantId}/recipe/signinup/code/remove`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                await mockRevokeCode(input);
            }
            return { status: "OK" };
        },
        updateUser: async function (input) {
            let response;

            if (process.env.MOCK !== "true") {
                response = await querier.sendPutRequest(
                    new NormalisedURLPath(`${input.tenantId}/recipe/user`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
            } else {
                response = await mockUpdateUser(input);
            }
            return response;
        },
    };
}
