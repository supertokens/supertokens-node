// @ts-nocheck
import { RecipeInterface, EmailService } from "../../emaildelivery/types";
import { TypeEmailDeliveryTypeInput } from "../types";
import EmailVerificationRecipe from "../../emailverification/recipe";
export default function getRecipeInterface(
    emailVerificationRecipe: EmailVerificationRecipe,
    service: EmailService<TypeEmailDeliveryTypeInput>
): RecipeInterface<TypeEmailDeliveryTypeInput>;
