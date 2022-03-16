// @ts-nocheck
import { ServiceInterface, TypeInput as SMTPTypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { Transporter } from "nodemailer";
import { TypePasswordlessEmailDeliveryTypeInput } from "../../../types";
export default function getSMTPService(
    config: SMTPTypeInput<TypePasswordlessEmailDeliveryTypeInput>
): import("../../../../../ingredients/emaildelivery/types").EmailDeliveryInterface<
    TypePasswordlessEmailDeliveryTypeInput
>;
export declare function getDefaultEmailServiceImplementation(
    transporter: Transporter,
    from: {
        name: string;
        email: string;
    }
): ServiceInterface<TypePasswordlessEmailDeliveryTypeInput>;
