// @ts-nocheck
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import { TypeThirdPartyPasswordlessSmsDeliveryInput } from "../../../types";
import { UserContext } from "../../../../../types";
export default class SupertokensService implements SmsDeliveryInterface<TypeThirdPartyPasswordlessSmsDeliveryInput> {
    private passwordlessSupertokensService;
    constructor(apiKey: string);
    sendSms: (
        input: TypeThirdPartyPasswordlessSmsDeliveryInput & {
            userContext: UserContext;
        }
    ) => Promise<void>;
}
