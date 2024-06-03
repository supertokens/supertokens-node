// @ts-nocheck
import { ServiceInterface, TypeInput } from "../../../../../ingredients/smsdelivery/services/twilio";
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import { TypePasswordlessSmsDeliveryInput } from "../../../types";
import { UserContext } from "../../../../../types";
export default class TwilioService implements SmsDeliveryInterface<TypePasswordlessSmsDeliveryInput> {
    serviceImpl: ServiceInterface<TypePasswordlessSmsDeliveryInput>;
    private config;
    constructor(config: TypeInput<TypePasswordlessSmsDeliveryInput>);
    sendSms: (
        input: TypePasswordlessSmsDeliveryInput & {
            userContext: UserContext;
        }
    ) => Promise<void>;
}
