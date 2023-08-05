"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getRecipeInterface(recipeInterface) {
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
exports.default = getRecipeInterface;
