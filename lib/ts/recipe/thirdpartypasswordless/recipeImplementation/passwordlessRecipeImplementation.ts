import { RecipeInterface } from "../../passwordless/types";
import { RecipeInterface as ThirdPartyPasswordlessRecipeInterface } from "../types";

export default function getRecipeInterface(recipeInterface: ThirdPartyPasswordlessRecipeInterface): RecipeInterface {
    return {
        consumeCode: async function (input) {
            return await recipeInterface.consumeCode(input);
        },
        createRecipeUser: async function (input) {
            return await recipeInterface.createPasswordlessRecipeUser(input);
        },
        verifyAndDeleteCode: async function (input) {
            return await recipeInterface.verifyAndDeleteCode(input);
        },
        createCode: async function (input) {
            return await recipeInterface.createCode(input);
        },
        createNewCodeForDevice: async function (input) {
            return await recipeInterface.createNewCodeForDevice(input);
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
