// @ts-nocheck
import { SupertokensServiceConfig } from "../../../../../ingredients/smsdelivery/services/supertokens";
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import { TypePasswordlessSmsDeliveryInput } from "../../../types";
export default class SupertokensService implements SmsDeliveryInterface<TypePasswordlessSmsDeliveryInput> {
    private config;
    constructor(config: SupertokensServiceConfig);
    sendSms: (input: TypePasswordlessSmsDeliveryInput) => Promise<void>;
}
