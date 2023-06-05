// @ts-nocheck
import { TypeEmailVerificationEmailDeliveryInput } from "../../../types";
import { GetContentResult } from "../../../../../ingredients/emaildelivery/services/smtp";
export default function getEmailVerifyEmailContent(input: TypeEmailVerificationEmailDeliveryInput): GetContentResult;
export declare function getEmailVerifyEmailHTML(appName: string, email: string, verificationLink: string): string;
