// @ts-nocheck
import { TypePasswordlessSmsDeliveryInput } from "../../../types";
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
export default class BackwardCompatibilityService implements SmsDeliveryInterface<TypePasswordlessSmsDeliveryInput> {
    constructor();
    sendSms: (
        input: TypePasswordlessSmsDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
