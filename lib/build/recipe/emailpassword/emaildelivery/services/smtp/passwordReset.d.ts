// @ts-nocheck
import { TypeEmailPasswordPasswordResetEmailDeliveryInput } from "../../../types";
import { GetContentResult } from "../../../../../ingredients/emaildelivery/services/smtp";
export default function getPasswordResetEmailContent(
    input: TypeEmailPasswordPasswordResetEmailDeliveryInput
): GetContentResult;
export declare function getPasswordResetEmailHTML(appName: string, email: string, resetLink: string): string;
