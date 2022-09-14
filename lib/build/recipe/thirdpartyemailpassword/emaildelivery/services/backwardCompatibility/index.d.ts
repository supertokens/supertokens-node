// @ts-nocheck
import { TypeThirdPartyEmailPasswordEmailDeliveryInput, User } from "../../../types";
import { RecipeInterface as EmailPasswordRecipeInterface } from "../../../../emailpassword";
import { NormalisedAppinfo } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeThirdPartyEmailPasswordEmailDeliveryInput> {
    private emailPasswordBackwardCompatibilityService;
    constructor(
        emailPasswordRecipeInterfaceImpl: EmailPasswordRecipeInterface,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        resetPasswordUsingTokenFeature?: {
            createAndSendCustomEmail?: (
                user: User,
                passwordResetURLWithToken: string,
                userContext: any
            ) => Promise<void>;
        }
    );
    sendEmail: (
        input: import("../../../../emailpassword/types").TypeEmailPasswordPasswordResetEmailDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
