import { RecipeInterface } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";

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
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/code/consume`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response;
        },
        createCode: async function (input) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/code`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response;
        },
        createNewCodeForDevice: async function (input) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/code`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response;
        },
        listCodesByDeviceId: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        listCodesByEmail: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response.devices;
        },
        listCodesByPhoneNumber: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response.devices;
        },
        listCodesByPreAuthSessionId: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        revokeAllCodes: async function (input) {
            await querier.sendPostRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes/remove`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return {
                status: "OK",
            };
        },
        revokeCode: async function (input) {
            await querier.sendPostRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/code/remove`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return { status: "OK" };
        },
        updateUser: async function (input) {
            let response = await querier.sendPutRequest(
                new NormalisedURLPath("/recipe/user"),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response;
        },
    };
}
