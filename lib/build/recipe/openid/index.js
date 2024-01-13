"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJWKS = exports.createJWT = exports.getOpenIdDiscoveryConfiguration = exports.init = void 0;
const utils_1 = require("../../utils");
const recipe_1 = __importDefault(require("./recipe"));
class OpenIdRecipeWrapper {
    static getOpenIdDiscoveryConfiguration(userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeImplementation.getOpenIdDiscoveryConfiguration({
            userContext: utils_1.getUserContext(userContext),
        });
    }
    static createJWT(payload, validitySeconds, useStaticSigningKey, userContext) {
        return recipe_1.default.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.createJWT({
            payload,
            validitySeconds,
            useStaticSigningKey,
            userContext: utils_1.getUserContext(userContext),
        });
    }
    static getJWKS(userContext) {
        return recipe_1.default.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.getJWKS({
            userContext: utils_1.getUserContext(userContext),
        });
    }
}
exports.default = OpenIdRecipeWrapper;
OpenIdRecipeWrapper.init = recipe_1.default.init;
exports.init = OpenIdRecipeWrapper.init;
exports.getOpenIdDiscoveryConfiguration = OpenIdRecipeWrapper.getOpenIdDiscoveryConfiguration;
exports.createJWT = OpenIdRecipeWrapper.createJWT;
exports.getJWKS = OpenIdRecipeWrapper.getJWKS;
