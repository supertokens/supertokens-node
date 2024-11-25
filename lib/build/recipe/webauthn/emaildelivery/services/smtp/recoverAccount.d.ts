// @ts-nocheck
import { TypeWebauthnRecoverAccountEmailDeliveryInput } from "../../../types";
import { GetContentResult } from "../../../../../ingredients/emaildelivery/services/smtp";
export default function getRecoverAccountEmailContent(
    input: TypeWebauthnRecoverAccountEmailDeliveryInput
): GetContentResult;
export declare function getRecoverAccountEmailHTML(appName: string, email: string, resetLink: string): string;
