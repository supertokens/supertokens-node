// @ts-nocheck
import { ServiceInterface, TypeInput as SMTPTypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { Transporter } from "nodemailer";
import { TypeEmailPasswordEmailDeliveryInput } from "../../../types";
export default function getSMTPService(
    config: SMTPTypeInput<TypeEmailPasswordEmailDeliveryInput>
): import("../../../../../ingredients/emaildelivery/types").EmailDeliveryInterface<TypeEmailPasswordEmailDeliveryInput>;
export declare function getDefaultEmailServiceImplementation(
    transporter: Transporter
): ServiceInterface<TypeEmailPasswordEmailDeliveryInput>;
