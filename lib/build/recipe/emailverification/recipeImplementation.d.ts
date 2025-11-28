// @ts-nocheck
import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import { GetEmailForRecipeUserIdFunc } from "./types";
import SuperTokens from "../../supertokens";
export default function getRecipeInterface(
    stInstance: SuperTokens,
    querier: Querier,
    getEmailForRecipeUserId: GetEmailForRecipeUserIdFunc
): RecipeInterface;
