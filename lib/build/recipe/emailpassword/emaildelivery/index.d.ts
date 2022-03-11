// @ts-nocheck
import { RecipeInterface, EmailService } from "../../emaildelivery/types";
import { TypeEmailPasswordEmailDeliveryInput } from "../types";
import EmailVerificationRecipe from "../../emailverification/recipe";
export default function getRecipeInterface(
    emailVerificationRecipe: EmailVerificationRecipe,
    service: EmailService<TypeEmailPasswordEmailDeliveryInput>
): RecipeInterface<TypeEmailPasswordEmailDeliveryInput>;
