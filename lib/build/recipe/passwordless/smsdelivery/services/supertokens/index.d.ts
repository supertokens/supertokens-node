// @ts-nocheck
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import { TypePasswordlessSmsDeliveryInput } from "../../../types";
export default class SupertokensService implements SmsDeliveryInterface<TypePasswordlessSmsDeliveryInput> {
    private apiKey;
    constructor(apiKey: string);
    sendSms: (input: TypePasswordlessSmsDeliveryInput) => Promise<void>;
}
