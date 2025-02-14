const WebAuthnRecipe = require("../../../lib/build/recipe/webauthn/recipe").default;

const getWebAuthnRecipe = () => {
    const recipe = WebAuthnRecipe.getInstanceOrThrowError();
    return recipe;
};

module.exports = getWebAuthnRecipe;
