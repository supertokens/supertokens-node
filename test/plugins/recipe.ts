import OverrideableBuilder from "supertokens-js-override";
import RecipeModule from "../../lib/build/recipeModule";
import { getRecipeImplementation } from "./recipeImplementation";
import { getAPIImplementation } from "./apiImplementation";
import SuperTokensError from "../../lib/build/error";
import { applyPlugins } from "../../lib/ts/plugins";

export function validateAndNormalizeUserInput(appInfo, config) {
    let override = {
        functions: (originalImplementation) => originalImplementation,
        apis: (originalImplementation) => originalImplementation,
        ...config?.override,
    };

    return { override };
}

export default class Recipe extends RecipeModule {
    static instance?: Recipe = undefined;
    static RECIPE_ID = "pluginTest";
    static initCalls: string[] = [];

    config;

    recipeInterfaceImpl;

    apiImpl;

    isInServerlessEnv;

    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        this.isInServerlessEnv = isInServerlessEnv;
        this.config = validateAndNormalizeUserInput(appInfo, config);
        {
            let builder = new OverrideableBuilder(getRecipeImplementation());
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new OverrideableBuilder(getAPIImplementation());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
    }

    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the Webauthn.init function?");
    }

    static init(config) {
        return (appInfo, isInServerlessEnv, plugins) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    applyPlugins(Recipe.RECIPE_ID, config as any, plugins ?? [])
                );

                return Recipe.instance;
            } else {
                throw new Error("Webauthn recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }

    static reset() {
        Recipe.instance = undefined;
        Recipe.initCalls = [];
    }

    getAPIsHandled() {
        return [];
    }
    async handleAPIRequest(id, tenantId, req, response, path, method, userContext) {
        return false;
    }
    async handleError(error, request, response, userContext) {}
    getAllCORSHeaders() {
        return [];
    }
    isErrorFromThisRecipe(err: any): err is SuperTokensError {
        return err instanceof SuperTokensError;
    }
}
