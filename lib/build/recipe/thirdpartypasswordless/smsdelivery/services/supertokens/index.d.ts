// @ts-nocheck
import { SupertokensServiceConfig } from "../../../../../ingredients/smsdelivery/services/supertokens";
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import { TypeThirdPartyPasswordlessSmsDeliveryInput } from "../../../types";
export default class SupertokensService implements SmsDeliveryInterface<TypeThirdPartyPasswordlessSmsDeliveryInput> {
    private passwordlessSupertokensService;
    constructor(config: SupertokensServiceConfig);
    sendSms: (
        input: import("../../../../passwordless/types").TypePasswordlessSmsDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
