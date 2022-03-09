// @ts-nocheck
import { RecipeInterface, EmailService } from "../../emaildelivery/types";
import { TypeEmailDeliveryTypeInput } from "../types";
export default function getRecipeInterface(
    service: EmailService<TypeEmailDeliveryTypeInput>
): RecipeInterface<TypeEmailDeliveryTypeInput>;
