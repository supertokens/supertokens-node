// @ts-nocheck
import { ServiceInterface, TypeInput as SMTPTypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { Transporter } from "nodemailer";
import { TypeThirdPartyEmailDeliveryInput } from "../../../types";
export default function getSMTPService(
    config: SMTPTypeInput<TypeThirdPartyEmailDeliveryInput>
): import("../../../../../ingredients/emaildelivery/types").EmailDeliveryInterface<
    import("../../../../emailverification/types").TypeEmailVerificationEmailDeliveryInput
>;
export declare function getDefaultEmailServiceImplementation(
    transporter: Transporter,
    from: {
        name: string;
        email: string;
    }
): ServiceInterface<TypeThirdPartyEmailDeliveryInput>;
