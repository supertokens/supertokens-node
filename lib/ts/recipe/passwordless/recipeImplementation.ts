import { RecipeInterface } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    return {
        consumeCode: async function (input) {
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/signinup/code/consume"), input);
            return response;
        },
        createCode: async function (input) {
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/signinup/code"), input);
            return response;
        },
        resendCode: async function (input) {
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/signinup/code"), input);
            return response;
        },
        getUserByEmail: async function (input) {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/user"), input);
            if (response.status === "OK") {
                return response.user;
            }
            return undefined;
        },
        getUserById: async function (input) {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/user"), input);
            if (response.status === "OK") {
                return response.user;
            }
            return undefined;
        },
        getUserByPhoneNumber: async function (input) {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/user"), input);
            if (response.status === "OK") {
                return response.user;
            }
            return undefined;
        },
        listCodesByDeviceId: async function (input) {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/signinup/codes"), input);
            return response;
        },
        listCodesByEmail: async function (input) {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/signinup/codes"), input);
            return response;
        },
        listCodesByPhoneNumber: async function (input) {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/signinup/codes"), input);
            return response;
        },
        listCodesByPreAuthSessionId: async function (input) {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/signinup/codes"), input);
            return response;
        },
        revokeAllCodes: async function (input) {
            await querier.sendPostRequest(new NormalisedURLPath("/recipe/signinup/codes/remove"), input);
            return {
                status: "OK",
            };
        },
        revokeCode: async function (input) {
            await querier.sendPostRequest(new NormalisedURLPath("/recipe/signinup/code/remove"), input);
            return { status: "OK" };
        },
        updateUser: async function (input) {
            let response = await querier.sendPutRequest(new NormalisedURLPath("/recipe/user"), input);
            return response;
        },
    };
}
