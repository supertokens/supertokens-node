// @ts-nocheck
import { RecipeInterface, SmsService } from "../smsdelivery/types";
import { TypeSMSDeliveryTypeInput } from "./types";
export default function getRecipeInterface(
    service: SmsService<TypeSMSDeliveryTypeInput>
): RecipeInterface<TypeSMSDeliveryTypeInput>;
