// @ts-nocheck
import { ServiceInterface, TypeInput as SMTPTypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { Transporter } from "nodemailer";
import { TypeEmailDeliveryTypeInput } from "../../../types";
export default function getSMTPService(
    config: SMTPTypeInput<TypeEmailDeliveryTypeInput>
): import("../../../../../ingredients/emaildelivery/types").EmailService<TypeEmailDeliveryTypeInput>;
export declare function getDefaultEmailServiceImplementation(
    transporter: Transporter,
    from: {
        name: string;
        email: string;
    }
): ServiceInterface<TypeEmailDeliveryTypeInput>;
