let SuperTokens = require("../../../lib/build/supertokens").default;

const getWebAuthnRecipe = () => {
    return SuperTokens.getInstanceOrThrowError().recipeModules.find((rm) => rm.getRecipeId() === "webauthn");
};

module.exports = getWebAuthnRecipe;
