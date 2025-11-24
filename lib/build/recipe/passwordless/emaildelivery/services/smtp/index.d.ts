// @ts-nocheck
import { ServiceInterface, TypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import { TypePasswordlessEmailDeliveryInput } from "../../../types";
import { UserContext } from "../../../../../types";
export default class SMTPService implements EmailDeliveryInterface<TypePasswordlessEmailDeliveryInput> {
    serviceImpl: ServiceInterface<TypePasswordlessEmailDeliveryInput>;
    constructor(config: TypeInput<TypePasswordlessEmailDeliveryInput>);
    sendEmail: (
        input: TypePasswordlessEmailDeliveryInput & {
            userContext: UserContext;
        }
    ) => Promise<void>;
}
