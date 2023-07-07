// @ts-nocheck
import { TypePasswordlessSmsDeliveryInput } from "../../../types";
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import { NormalisedAppinfo } from "../../../../../types";
export default class BackwardCompatibilityService implements SmsDeliveryInterface<TypePasswordlessSmsDeliveryInput> {
    private createAndSendCustomSms;
    constructor(appInfo: NormalisedAppinfo);
    sendSms: (
        input: TypePasswordlessSmsDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
