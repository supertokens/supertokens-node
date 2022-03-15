// @ts-nocheck
import { ServiceInterface, TypeInput as SMTPTypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { Transporter } from "nodemailer";
import { TypeThirdPartyEmailPasswordEmailDeliveryInput } from "../../../types";
export default function getSMTPService(
    config: SMTPTypeInput<TypeThirdPartyEmailPasswordEmailDeliveryInput>
): import("../../../../../ingredients/emaildelivery/types").EmailService<
    import("../../../../emailpassword/types").TypeEmailPasswordEmailDeliveryInput
>;
export declare function getDefaultEmailServiceImplementation(
    transporter: Transporter,
    from: {
        name: string;
        email: string;
    }
): ServiceInterface<TypeThirdPartyEmailPasswordEmailDeliveryInput>;
