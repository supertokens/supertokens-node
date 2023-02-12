// @ts-nocheck
import { ServiceInterface, TypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { TypeThirdPartyPasswordlessEmailDeliveryInput } from "../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class SMTPService implements EmailDeliveryInterface<TypeThirdPartyPasswordlessEmailDeliveryInput> {
    serviceImpl: ServiceInterface<TypeThirdPartyPasswordlessEmailDeliveryInput>;
    private passwordlessSMTPService;
    constructor(config: TypeInput<TypeThirdPartyPasswordlessEmailDeliveryInput>);
    sendEmail: (
        input: TypeThirdPartyPasswordlessEmailDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
