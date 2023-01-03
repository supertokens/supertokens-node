// @ts-nocheck
import type { NormalisedAppinfo } from "../../types";
import type { TypeInput, RecipeLevelUser, TypeNormalisedInput } from "./types";
export declare function validateAndNormaliseUserInput(_: NormalisedAppinfo, config: TypeInput): TypeNormalisedInput;
export declare function getUserForRecipeId(
    userId: string,
    recipeId: string
): Promise<{
    user: RecipeLevelUser | undefined;
    recipe:
        | "emailpassword"
        | "thirdparty"
        | "passwordless"
        | "thirdpartyemailpassword"
        | "thirdpartypasswordless"
        | undefined;
}>;
