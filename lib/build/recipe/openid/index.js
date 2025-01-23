"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOpenIdDiscoveryConfiguration = exports.init = void 0;
const utils_1 = require("../../utils");
const recipe_1 = __importDefault(require("./recipe"));
class OpenIdRecipeWrapper {
    static getOpenIdDiscoveryConfiguration(userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeImplementation.getOpenIdDiscoveryConfiguration({
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
}
OpenIdRecipeWrapper.init = recipe_1.default.init;
exports.default = OpenIdRecipeWrapper;
exports.init = OpenIdRecipeWrapper.init;
exports.getOpenIdDiscoveryConfiguration = OpenIdRecipeWrapper.getOpenIdDiscoveryConfiguration;
