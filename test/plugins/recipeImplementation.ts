import { RecipeReturnType } from "./types";

export function getRecipeImplementation() {
    return {
        signIn: (message, stack): RecipeReturnType<"Recipe"> => {
            return {
                type: "Recipe",
                function: "signIn",
                stack: [...stack, "original"],
                message: message,
            };
        },
    };
}
