// @ts-nocheck
import { RecipeInterface, EmailService } from "../../emaildelivery/types";
import { TypeEmailVerificationEmailDeliveryInput } from "../types";
export default function getRecipeInterface(
    service: EmailService<TypeEmailVerificationEmailDeliveryInput>
): RecipeInterface<TypeEmailVerificationEmailDeliveryInput>;
