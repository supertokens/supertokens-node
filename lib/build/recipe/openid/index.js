"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = require("./recipe");
class OpenIDRecipeWrapper {
    static getDiscoveryConfiguration() {
        return recipe_1.default.getInstanceOrThrowError().recipeImplementation.getDiscoveryConfiguration();
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
exports.default = OpenIDRecipeWrapper;
OpenIDRecipeWrapper.init = recipe_1.default.init;
exports.init = OpenIDRecipeWrapper.init;
exports.getDiscoveryConfiguration = OpenIDRecipeWrapper.getDiscoveryConfiguration;
exports.createJWT = OpenIDRecipeWrapper.createJWT;
exports.getJWKS = OpenIDRecipeWrapper.getJWKS;
