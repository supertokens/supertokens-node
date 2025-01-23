// @ts-nocheck
import { RecipeInterface, TypeNormalisedInput } from "./types";
import { Querier } from "../../querier";
import { NormalisedAppinfo } from "../../types";
export type Helpers = {
    querier: Querier;
    config: TypeNormalisedInput;
    appInfo: NormalisedAppinfo;
    getRecipeImpl: () => RecipeInterface;
};
export default function getRecipeInterface(
    querier: Querier,
    config: TypeNormalisedInput,
    appInfo: NormalisedAppinfo,
    getRecipeImplAfterOverrides: () => RecipeInterface
): RecipeInterface;
