// @ts-nocheck
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import { TypeThirdPartyPasswordlessSmsDeliveryInput } from "../../../types";
export default class SupertokensService implements SmsDeliveryInterface<TypeThirdPartyPasswordlessSmsDeliveryInput> {
    private passwordlessSupertokensService;
    constructor(apiKey: string);
    sendSms: (
        input: TypeThirdPartyPasswordlessSmsDeliveryInput & {
            userContext: Record<string, any>;
        }
    ) => Promise<void>;
}
