// @ts-nocheck
import { ServiceInterface, TypeInput } from "../../../../../ingredients/emaildelivery/services/smtp";
import { TypeWebauthnEmailDeliveryInput } from "../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import { UserContext } from "../../../../../types";
export default class SMTPService implements EmailDeliveryInterface<TypeWebauthnEmailDeliveryInput> {
    serviceImpl: ServiceInterface<TypeWebauthnEmailDeliveryInput>;
    constructor(config: TypeInput<TypeWebauthnEmailDeliveryInput>);
    sendEmail: (
        input: TypeWebauthnEmailDeliveryInput & {
            userContext: UserContext;
        }
    ) => Promise<void>;
}
