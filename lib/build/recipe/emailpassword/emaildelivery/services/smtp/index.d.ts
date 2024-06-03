// @ts-nocheck
import { ServiceInterface, TypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { TypeEmailPasswordEmailDeliveryInput } from "../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import { UserContext } from "../../../../../types";
export default class SMTPService implements EmailDeliveryInterface<TypeEmailPasswordEmailDeliveryInput> {
    serviceImpl: ServiceInterface<TypeEmailPasswordEmailDeliveryInput>;
    constructor(config: TypeInput<TypeEmailPasswordEmailDeliveryInput>);
    sendEmail: (
        input: TypeEmailPasswordEmailDeliveryInput & {
            userContext: UserContext;
        }
    ) => Promise<void>;
}
