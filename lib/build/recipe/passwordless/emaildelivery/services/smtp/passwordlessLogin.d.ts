// @ts-nocheck
import { TypePasswordlessEmailDeliveryTypeInput } from "../../../types";
import { GetContentResult } from "../../../../../ingredients/emaildelivery/services/smtp";
export default function getPasswordlessLoginEmailContent(
    input: TypePasswordlessEmailDeliveryTypeInput,
    from: {
        name: string;
        email: string;
    }
): GetContentResult;
