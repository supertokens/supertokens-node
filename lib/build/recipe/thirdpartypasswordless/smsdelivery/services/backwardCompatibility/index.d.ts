// @ts-nocheck
import { TypeThirdPartyPasswordlessSmsDeliveryInput } from "../../../types";
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
export default class BackwardCompatibilityService
    implements SmsDeliveryInterface<TypeThirdPartyPasswordlessSmsDeliveryInput> {
    private passwordlessBackwardCompatibilityService;
    constructor();
    sendSms: (
        input: TypeThirdPartyPasswordlessSmsDeliveryInput & {
            userContext: Record<string, any>;
        }
    ) => Promise<void>;
}
