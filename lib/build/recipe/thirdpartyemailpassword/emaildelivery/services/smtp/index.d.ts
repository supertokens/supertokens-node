// @ts-nocheck
import { ServiceInterface, TypeInput as SMTPTypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { Transporter } from "nodemailer";
import { TypeThirdPartyEmailPasswordEmailDeliveryInput } from "../../../types";
export default function getSMTPService(
    config: SMTPTypeInput<TypeThirdPartyEmailPasswordEmailDeliveryInput>
): import("../../../../../ingredients/emaildelivery/types").EmailDeliveryInterface<
    import("../../../../emailpassword/types").TypeEmailPasswordEmailDeliveryInput
>;
export declare function getDefaultEmailServiceImplementation(
    transporter: Transporter
): ServiceInterface<TypeThirdPartyEmailPasswordEmailDeliveryInput>;
