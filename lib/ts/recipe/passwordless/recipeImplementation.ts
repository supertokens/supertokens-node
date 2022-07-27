import { RecipeInterface } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { isUserIdMappingRecipeInitialized } from "../useridmapping/recipe";
import { getUserIdMapping } from "./../useridmapping/index";

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

            if (isUserIdMappingRecipeInitialized) {
                if (isUserIdMappingRecipeInitialized) {
                    let userIdMappingResponse = await getUserIdMapping(
                        response.user.id,
                        "SUPERTOKENS",
                        input.userContext
                    );
                    if (userIdMappingResponse.status === "OK") {
                        response.user.id = userIdMappingResponse.externalUserId;
                    }
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
                if (isUserIdMappingRecipeInitialized) {
                    let userIdMappingResponse = await getUserIdMapping(
                        response.user.id,
                        "SUPERTOKENS",
                        input.userContext
                    );
                    if (userIdMappingResponse.status === "OK") {
                        response.user.id = userIdMappingResponse.externalUserId;
                    }
                }
                return response.user;
            }
            return undefined;
        },
        getUserById: async function (input) {
            let externalId = undefined;
            if (isUserIdMappingRecipeInitialized) {
                let userIdMappingResponse = await getUserIdMapping(input.userId, "ANY", input.userContext);
                if (userIdMappingResponse.status === "OK") {
                    input.userId = userIdMappingResponse.superTokensUserId;
                    externalId = userIdMappingResponse.externalUserId;
                }
            }
            let response = await querier.sendGetRequest(
                new NormalisedURLPath("/recipe/user"),
                copyAndRemoveUserContext(input)
            );
            if (response.status === "OK") {
                if (externalId !== undefined) {
                    response.user.id = externalId;
                }
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
                if (isUserIdMappingRecipeInitialized) {
                    let userIdMappingResponse = await getUserIdMapping(
                        response.user.id,
                        "SUPERTOKENS",
                        input.userContext
                    );
                    if (userIdMappingResponse.status === "OK") {
                        response.user.id = userIdMappingResponse.externalUserId;
                    }
                }
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
            if (isUserIdMappingRecipeInitialized) {
                let userIdMappingResponse = await getUserIdMapping(input.userId, "ANY", input.userContext);
                if (userIdMappingResponse.status === "OK") {
                    input.userId = userIdMappingResponse.superTokensUserId;
                }
            }
            let response = await querier.sendPutRequest(
                new NormalisedURLPath("/recipe/user"),
                copyAndRemoveUserContext(input)
            );
            return response;
        },
    };
}
