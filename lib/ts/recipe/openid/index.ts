import { getUserContext } from "../../utils";
import OpenIdRecipe from "./recipe";

export default class OpenIdRecipeWrapper {
    static init = OpenIdRecipe.init;

    static getOpenIdDiscoveryConfiguration(userContext?: Record<string, any>) {
        return OpenIdRecipe.getInstanceOrThrowError().recipeImplementation.getOpenIdDiscoveryConfiguration({
            userContext: getUserContext(userContext),
        });
    }
}

export let init = OpenIdRecipeWrapper.init;
export let getOpenIdDiscoveryConfiguration = OpenIdRecipeWrapper.getOpenIdDiscoveryConfiguration;
