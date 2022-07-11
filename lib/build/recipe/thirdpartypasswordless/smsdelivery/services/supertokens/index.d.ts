// @ts-nocheck
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import { TypeThirdPartyPasswordlessSmsDeliveryInput } from "../../../types";
export default class SupertokensService implements SmsDeliveryInterface<TypeThirdPartyPasswordlessSmsDeliveryInput> {
    private passwordlessSupertokensService;
    constructor(apiKey: string);
    sendSms: (
        input: import("../../../../passwordless/types").TypePasswordlessSmsDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
