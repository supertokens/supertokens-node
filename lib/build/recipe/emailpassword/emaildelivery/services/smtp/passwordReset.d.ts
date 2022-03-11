// @ts-nocheck
import { TypeEmailPasswordPasswordResetEmailDeliveryInput } from "../../../types";
import { GetContentResult } from "../../../../emaildelivery/services/smtp";
export default function getPasswordResetEmailContent(
    input: TypeEmailPasswordPasswordResetEmailDeliveryInput,
    from: {
        name: string;
        email: string;
    }
): GetContentResult;
