// @ts-nocheck
import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import { GetEmailForRecipeUserIdFunc } from "./types";
export default function getRecipeInterface(
    querier: Querier,
    getEmailForRecipeUserId: GetEmailForRecipeUserIdFunc
): RecipeInterface;
