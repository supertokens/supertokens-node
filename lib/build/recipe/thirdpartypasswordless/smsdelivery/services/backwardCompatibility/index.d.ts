// @ts-nocheck
import { TypeThirdPartyPasswordlessSmsDeliveryInput } from "../../../types";
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import { NormalisedAppinfo } from "../../../../../types";
export default class BackwardCompatibilityService
    implements SmsDeliveryInterface<TypeThirdPartyPasswordlessSmsDeliveryInput> {
    private passwordlessBackwardCompatibilityService;
    constructor(appInfo: NormalisedAppinfo);
    sendSms: (
        input: TypeThirdPartyPasswordlessSmsDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
