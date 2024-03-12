// @ts-nocheck
import { TypeThirdPartyPasswordlessSmsDeliveryInput } from "../../../types";
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import { UserContext } from "../../../../../types";
export default class BackwardCompatibilityService
    implements SmsDeliveryInterface<TypeThirdPartyPasswordlessSmsDeliveryInput> {
    private passwordlessBackwardCompatibilityService;
    constructor();
    sendSms: (
        input: TypeThirdPartyPasswordlessSmsDeliveryInput & {
            userContext: UserContext;
        }
    ) => Promise<void>;
}
