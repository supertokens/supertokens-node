// @ts-nocheck
import { TypeEmailPasswordEmailDeliveryInput } from "../../../types";
import { Transporter } from "nodemailer";
import { ServiceInterface } from "../../../../../ingredients/emaildelivery/services/smtp";
import SMTPService from "../../../../emailverification/emaildelivery/services/smtp";
export declare function getServiceImplementation(
    transporter: Transporter,
    emailVerificationSMTPEmailService: SMTPService
): ServiceInterface<TypeEmailPasswordEmailDeliveryInput>;
