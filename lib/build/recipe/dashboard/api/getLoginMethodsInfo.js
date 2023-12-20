"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoginMethodsInfo = void 0;
const recipe_1 = __importDefault(require("../../passwordless/recipe"));
const recipe_2 = __importDefault(require("../../emailpassword/recipe"));
const multitenancy_1 = __importDefault(require("../../multitenancy"));
const getLoginMethodsInfo = async (_, tenantId, ___, ____) => {
    let passwordlessRecipe = undefined;
    let emailPasswordRecipe = undefined;
    const loginMethods = [];
    const tenantDetails = await multitenancy_1.default.getTenant(tenantId);
    try {
        passwordlessRecipe = recipe_1.default.getInstanceOrThrowError();
    } catch (error) {}
    try {
        emailPasswordRecipe = recipe_2.default.getInstanceOrThrowError();
    } catch (error) {}
    //  this api should change change...
    if (tenantDetails === undefined) {
        if (passwordlessRecipe !== undefined) {
            loginMethods.push({
                methodType: "passwordless",
                contactMethod: passwordlessRecipe.config.contactMethod,
            });
        }
        if (emailPasswordRecipe !== undefined) {
            loginMethods.push({
                methodType: "emailPassword",
            });
        }
    } else {
        if (tenantDetails.emailPassword && emailPasswordRecipe !== undefined) {
            loginMethods.push({ methodType: "emailPassword" });
        }
        if (tenantDetails.passwordless && passwordlessRecipe !== undefined) {
            loginMethods.push({ methodType: "passwordless", contactMethod: passwordlessRecipe.config.contactMethod });
        }
    }
    return {
        status: "OK",
        loginMethods,
    };
};
exports.getLoginMethodsInfo = getLoginMethodsInfo;
