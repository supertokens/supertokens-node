import { RecipeReturnType } from "./types";

export function getAPIImplementation() {
    return {
        signInPOST: (message, stack): RecipeReturnType<"API"> => {
            return {
                type: "API",
                function: "signIn",
                stack: [...stack, "original"],
                message: message,
            };
        },
    };
}
