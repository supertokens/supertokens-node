// @ts-nocheck
import { ServiceInterface, TypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import { TypePasswordlessEmailDeliveryInput } from "../../../types";
export default class SMTPService implements EmailDeliveryInterface<TypePasswordlessEmailDeliveryInput> {
    serviceImpl: ServiceInterface<TypePasswordlessEmailDeliveryInput>;
    constructor(config: TypeInput<TypePasswordlessEmailDeliveryInput>);
    sendEmail: (
        input: TypePasswordlessEmailDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
