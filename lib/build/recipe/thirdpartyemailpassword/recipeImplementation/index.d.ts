// @ts-nocheck
import { RecipeInterface } from "../types";
import { Querier } from "../../../querier";
import { TypeInputFormField } from "../../emailpassword/types";
export default function getRecipeInterface(
    emailPasswordQuerier: Querier,
    thirdPartyQuerier?: Querier,
    formFields?: TypeInputFormField[] | undefined
): RecipeInterface;
