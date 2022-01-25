import { RecipeInterface } from "../../passwordless/types";
import { RecipeInterface as ThirdPartyPasswordlessRecipeInterface } from "../types";

export default function getRecipeInterface(recipeInterface: ThirdPartyPasswordlessRecipeInterface): RecipeInterface {
    return {
        consumeCode: async function (input) {
            return await recipeInterface.consumeCode(input);
        },
        createCode: async function (input) {
            return await recipeInterface.createCode(input);
        },
        createNewCodeForDevice: async function (input) {
            return await recipeInterface.createNewCodeForDevice(input);
        },
        getUserByEmail: async function (input) {
            let users = await recipeInterface.getUsersByEmail(input);
            for (let i = 0; i < users.length; i++) {
                let u = users[i];
                if (!("thirdParty" in u)) {
                    return u;
                }
            }
            return undefined;
        },
        getUserById: async function (input) {
            return await recipeInterface.getUserById(input);
        },
        getUserByPhoneNumber: async function (input) {
            return await recipeInterface.getUserByPhoneNumber(input);
        },
        listCodesByDeviceId: async function (input) {
            return await recipeInterface.listCodesByDeviceId(input);
        },
        listCodesByEmail: async function (input) {
            return await recipeInterface.listCodesByEmail(input);
        },
        listCodesByPhoneNumber: async function (input) {
            return await recipeInterface.listCodesByPhoneNumber(input);
        },
        listCodesByPreAuthSessionId: async function (input) {
            return await recipeInterface.listCodesByPreAuthSessionId(input);
        },
        revokeAllCodes: async function (input) {
            return await recipeInterface.revokeAllCodes(input);
        },
        revokeCode: async function (input) {
            return await recipeInterface.revokeCode(input);
        },
        updateUser: async function (input) {
            return await recipeInterface.updatePasswordlessUser(input);
        },
    };
}
