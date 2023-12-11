// @ts-nocheck
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import { ServiceInterface, TypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { TypeEmailVerificationEmailDeliveryInput } from "../../../types";
export default class SMTPService implements EmailDeliveryInterface<TypeEmailVerificationEmailDeliveryInput> {
    serviceImpl: ServiceInterface<TypeEmailVerificationEmailDeliveryInput>;
    constructor(config: TypeInput<TypeEmailVerificationEmailDeliveryInput>);
    sendEmail: (
        input: TypeEmailVerificationEmailDeliveryInput & {
            userContext: Record<string, any>;
        }
    ) => Promise<void>;
}
