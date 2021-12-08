"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = require("./recipe");
class OpenIdRecipeWrapper {
    static getOpenIdDiscoveryConfiguration() {
        return recipe_1.default.getInstanceOrThrowError().recipeImplementation.getOpenIdDiscoveryConfiguration();
    }
    static createJWT(payload, validitySeconds) {
        return recipe_1.default.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.createJWT({
            payload,
            validitySeconds,
        });
    }
    static getJWKS() {
        return recipe_1.default.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.getJWKS();
    }
}
exports.default = OpenIdRecipeWrapper;
OpenIdRecipeWrapper.init = recipe_1.default.init;
exports.init = OpenIdRecipeWrapper.init;
exports.getOpenIdDiscoveryConfiguration = OpenIdRecipeWrapper.getOpenIdDiscoveryConfiguration;
exports.createJWT = OpenIdRecipeWrapper.createJWT;
exports.getJWKS = OpenIdRecipeWrapper.getJWKS;
