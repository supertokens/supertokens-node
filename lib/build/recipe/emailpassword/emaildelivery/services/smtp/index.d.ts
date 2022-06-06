// @ts-nocheck
import { ServiceInterface, TypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { TypeEmailPasswordEmailDeliveryInput } from "../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class SMTPService implements EmailDeliveryInterface<TypeEmailPasswordEmailDeliveryInput> {
    serviceImpl: ServiceInterface<TypeEmailPasswordEmailDeliveryInput>;
    private emailVerificationSMTPService;
    constructor(config: TypeInput<TypeEmailPasswordEmailDeliveryInput>);
    sendEmail: (
        input:
            | (import("../../../../emailverification/types").TypeEmailVerificationEmailDeliveryInput & {
                  userContext: any;
              })
            | (import("../../../types").TypeEmailPasswordPasswordResetEmailDeliveryInput & {
                  userContext: any;
              })
    ) => Promise<void>;
}
