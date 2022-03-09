// @ts-nocheck
import { TypeEmailDeliveryTypeInput } from "../../../types";
import { GetContentResult } from "../../../../emaildelivery/services/smtp";
export default function getPasswordlessLoginEmailContent(
    input: TypeEmailDeliveryTypeInput,
    from: {
        name: string;
        email: string;
    }
): GetContentResult;
