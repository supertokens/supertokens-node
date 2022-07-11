// @ts-nocheck
import { TypeThirdPartyPasswordlessSmsDeliveryInput } from "../../../types";
import { SmsDeliveryInterface } from "../../../../../ingredients/smsdelivery/types";
import { NormalisedAppinfo } from "../../../../../types";
export default class BackwardCompatibilityService
    implements SmsDeliveryInterface<TypeThirdPartyPasswordlessSmsDeliveryInput> {
    private passwordlessBackwardCompatibilityService;
    constructor(
        appInfo: NormalisedAppinfo,
        passwordlessFeature?: {
            createAndSendCustomTextMessage?: (
                input: {
                    phoneNumber: string;
                    userInputCode?: string;
                    urlWithLinkCode?: string;
                    codeLifetime: number;
                    preAuthSessionId: string;
                },
                userContext: any
            ) => Promise<void>;
        }
    );
    sendSms: (
        input: import("../../../../passwordless/types").TypePasswordlessSmsDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
