// @ts-nocheck
import { TypePasswordlessEmailDeliveryInput } from "../../../types";
import { GetContentResult } from "../../../../../ingredients/emaildelivery/services/smtp";
export default function getPasswordlessLoginEmailContent(input: TypePasswordlessEmailDeliveryInput): GetContentResult;
export declare function getPasswordlessLoginEmailHTML(
    appName: string,
    email: string,
    codeLifetime: number,
    urlWithLinkCode?: string,
    userInputCode?: string
): string;
