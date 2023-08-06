"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getRecipeInterface(recipeInterface) {
    return {
        signUp: async function (input) {
            return await recipeInterface.emailPasswordSignUp(input);
        },
        signIn: async function (input) {
            return recipeInterface.emailPasswordSignIn(input);
        },
        createResetPasswordToken: async function (input) {
            return recipeInterface.createResetPasswordToken(input);
        },
        consumePasswordResetToken: async function (input) {
            return recipeInterface.consumePasswordResetToken(input);
        },
        createNewRecipeUser: async function (input) {
            return recipeInterface.createNewEmailPasswordRecipeUser(input);
        },
        updateEmailOrPassword: async function (input) {
            return recipeInterface.updateEmailOrPassword(input);
        },
    };
}
exports.default = getRecipeInterface;
