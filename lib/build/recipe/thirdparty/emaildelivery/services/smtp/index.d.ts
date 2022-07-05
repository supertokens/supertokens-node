// @ts-nocheck
import { TypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import { TypeThirdPartyEmailDeliveryInput } from "../../../types";
export default class SMTPService implements EmailDeliveryInterface<TypeThirdPartyEmailDeliveryInput> {
    private emailVerificationSMTPService;
    constructor(config: TypeInput<TypeThirdPartyEmailDeliveryInput>);
    sendEmail: (
        input: import("../../../../emailverification/types").TypeEmailVerificationEmailDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
