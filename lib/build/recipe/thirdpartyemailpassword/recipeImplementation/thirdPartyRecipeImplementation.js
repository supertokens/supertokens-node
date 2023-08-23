"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getRecipeInterface(recipeInterface) {
    return {
        signInUp: async function (input) {
            return await recipeInterface.thirdPartySignInUp(input);
        },
        manuallyCreateOrUpdateUser: async function (input) {
            let result = await recipeInterface.thirdPartyManuallyCreateOrUpdateUser(input);
            if (result.status !== "OK") {
                return result;
            }
            if (result.user.thirdParty === undefined) {
                throw new Error("Should never come here");
            }
            return {
                status: "OK",
                createdNewRecipeUser: result.createdNewRecipeUser,
                user: result.user,
                recipeUserId: result.recipeUserId,
            };
        },
        getProvider: async function (input) {
            return await recipeInterface.thirdPartyGetProvider(input);
        },
    };
}
exports.default = getRecipeInterface;
