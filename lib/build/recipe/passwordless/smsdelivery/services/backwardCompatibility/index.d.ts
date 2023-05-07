// @ts-nocheck
import { TypePasswordlessSmsDeliveryInput } from "../../../types";
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import { NormalisedAppinfo } from "../../../../../types";
export default class BackwardCompatibilityService implements SmsDeliveryInterface<TypePasswordlessSmsDeliveryInput> {
    private createAndSendCustomSms;
    constructor(
        appInfo: NormalisedAppinfo,
        createAndSendCustomSms?: (
            input: {
                phoneNumber: string;
                userInputCode?: string;
                urlWithLinkCode?: string;
                codeLifetime: number;
                preAuthSessionId: string;
            },
            userContext: any
        ) => Promise<void>
    );
    sendSms: (
        input: TypePasswordlessSmsDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
