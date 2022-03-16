// @ts-nocheck
import { TypeThirdPartyEmailDeliveryInput, User } from "../../../types";
import { NormalisedAppinfo } from "../../../../../types";
import Recipe from "../../../recipe";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService implements EmailDeliveryInterface<TypeThirdPartyEmailDeliveryInput> {
    private recipeInstance;
    private appInfo;
    private emailVerificationFeature?;
    constructor(
        recipeInstance: Recipe,
        appInfo: NormalisedAppinfo,
        emailVerificationFeature?: {
            createAndSendCustomEmail?: (
                user: User,
                emailVerificationURLWithToken: string,
                userContext: any
            ) => Promise<void>;
        }
    );
    sendEmail: (
        input: import("../../../../emailverification/types").TypeEmailVerificationEmailDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
