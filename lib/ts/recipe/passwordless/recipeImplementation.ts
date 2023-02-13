import { RecipeInterface } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import AccountLinking from "../accountlinking";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    function copyAndRemoveUserContext(input: any): any {
        let result = {
            ...input,
        };
        delete result.userContext;
        return result;
    }

    return {
        consumeCode: async function (input) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/signinup/code/consume"),
                copyAndRemoveUserContext(input)
            );
            if (response.status === "OK" && response.createdNewUser) {
                if (input.doAccountLinking) {
                    let primaryUserId = await AccountLinking.doPostSignUpAccountLinkingOperations(
                        {
                            email: response.email,
                            phoneNumber: response.phoneNumber,
                            recipeId: "passwordless",
                        },
                        true,
                        response.user.id,
                        input.userContext
                    );
                    response.user.id = primaryUserId;
                }
            }
            return response;
        },
        createCode: async function (input) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/signinup/code"),
                copyAndRemoveUserContext(input)
            );
            return response;
        },
        createNewCodeForDevice: async function (input) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/signinup/code"),
                copyAndRemoveUserContext(input)
            );
            return response;
        },
        getUserByEmail: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath("/recipe/user"),
                copyAndRemoveUserContext(input)
            );
            if (response.status === "OK") {
                return response.user;
            }
            return undefined;
        },
        getUserById: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath("/recipe/user"),
                copyAndRemoveUserContext(input)
            );
            if (response.status === "OK") {
                return response.user;
            }
            return undefined;
        },
        getUserByPhoneNumber: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath("/recipe/user"),
                copyAndRemoveUserContext(input)
            );
            if (response.status === "OK") {
                return response.user;
            }
            return undefined;
        },
        listCodesByDeviceId: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath("/recipe/signinup/codes"),
                copyAndRemoveUserContext(input)
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        listCodesByEmail: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath("/recipe/signinup/codes"),
                copyAndRemoveUserContext(input)
            );
            return response.devices;
        },
        listCodesByPhoneNumber: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath("/recipe/signinup/codes"),
                copyAndRemoveUserContext(input)
            );
            return response.devices;
        },
        listCodesByPreAuthSessionId: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath("/recipe/signinup/codes"),
                copyAndRemoveUserContext(input)
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        revokeAllCodes: async function (input) {
            await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/signinup/codes/remove"),
                copyAndRemoveUserContext(input)
            );
            return {
                status: "OK",
            };
        },
        revokeCode: async function (input) {
            await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/signinup/code/remove"),
                copyAndRemoveUserContext(input)
            );
            return { status: "OK" };
        },
        updateUser: async function (input) {
            let response = await querier.sendPutRequest(
                new NormalisedURLPath("/recipe/user"),
                copyAndRemoveUserContext(input)
            );
            return response;
        },
        getEmailOrPhoneNumberForCode: async function (input) {
            let response = await querier.sendPutRequest(
                new NormalisedURLPath("/recipe/email-or-phonenumber"),
                copyAndRemoveUserContext(input)
            );
            if (response.status === "OK") {
                return {
                    email: response.email,
                    phoneNumber: response.phoneNumber,
                };
            }
            return undefined;
        },
    };
}
