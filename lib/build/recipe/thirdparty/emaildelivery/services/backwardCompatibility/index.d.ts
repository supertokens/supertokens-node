// @ts-nocheck
import { TypeThirdPartyEmailDeliveryInput, User, RecipeInterface } from "../../../types";
import { NormalisedAppinfo } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService implements EmailDeliveryInterface<TypeThirdPartyEmailDeliveryInput> {
    private recipeInterfaceImpl;
    private appInfo;
    private isInServerlessEnv;
    private emailVerificationBackwardCompatibilityService;
    constructor(
        recipeInterfaceImpl: RecipeInterface,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
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
