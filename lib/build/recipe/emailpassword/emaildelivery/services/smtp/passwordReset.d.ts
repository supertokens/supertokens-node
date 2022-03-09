// @ts-nocheck
import { TypeEmailPasswordPasswordResetEmailDeliveryTypeInput } from "../../../types";
import { GetContentResult } from "../../../../emaildelivery/services/smtp";
export default function getPasswordResetEmailContent(
    input: TypeEmailPasswordPasswordResetEmailDeliveryTypeInput,
    from: {
        name: string;
        email: string;
    }
): GetContentResult;
