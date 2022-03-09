// @ts-nocheck
import { ServiceInterface, SMTPInputConfig } from "../../../../emaildelivery/services/smtp";
import { Transporter } from "nodemailer";
import { TypeEmailDeliveryTypeInput } from "../../../types";
export default function getEmailPasswordEmailServiceSMTP(
    config: SMTPInputConfig<TypeEmailDeliveryTypeInput>
): import("../../../../emaildelivery/types").EmailService<TypeEmailDeliveryTypeInput>;
export declare function getDefaultEmailServiceImplementation(
    transporter: Transporter,
    from: {
        name: string;
        email: string;
    }
): ServiceInterface<TypeEmailDeliveryTypeInput>;
