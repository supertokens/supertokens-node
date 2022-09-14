// @ts-nocheck
import { TypeThirdPartyPasswordlessEmailDeliveryInput } from "../../../types";
import { NormalisedAppinfo } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeThirdPartyPasswordlessEmailDeliveryInput> {
    private passwordlessBackwardCompatibilityService;
    constructor(
        appInfo: NormalisedAppinfo,
        passwordlessFeature?: {
            createAndSendCustomEmail?: (
                input: {
                    email: string;
                    userInputCode?: string;
                    urlWithLinkCode?: string;
                    codeLifetime: number;
                    preAuthSessionId: string;
                },
                userContext: any
            ) => Promise<void>;
        }
    );
    sendEmail: (
        input: import("../../../../passwordless/types").TypePasswordlessEmailDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
