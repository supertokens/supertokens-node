// @ts-nocheck
import { TypeThirdPartyPasswordlessEmailDeliveryInput } from "../../../../types";
import { Transporter } from "nodemailer";
import { ServiceInterface } from "../../../../../../ingredients/emaildelivery/services/smtp";
export declare function getServiceImplementation(
    transporter: Transporter
): ServiceInterface<TypeThirdPartyPasswordlessEmailDeliveryInput>;
