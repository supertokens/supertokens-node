import OverrideableBuilder from "supertokens-js-override";

export type RecipeReturnType<T extends "Recipe" | "API"> = {
    type: T;
    function: string;
    stack: string[];
    message: string;
};

export type APIInterface = {
    signInPOST?: (message: string, stack: string[]) => RecipeReturnType<"API">;
};

export type RecipeInterface = {
    signIn: (message: string, stack: string[]) => RecipeReturnType<"Recipe">;
};

export type PluginTestConfig = {
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type NormalizedPluginTestConfig = {
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
