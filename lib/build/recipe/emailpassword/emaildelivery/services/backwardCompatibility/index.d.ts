// @ts-nocheck
import { TypeEmailPasswordEmailDeliveryInput, User, RecipeInterface } from "../../../types";
import { NormalisedAppinfo } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeEmailPasswordEmailDeliveryInput> {
    private recipeInterfaceImpl;
    private isInServerlessEnv;
    private appInfo;
    private resetPasswordUsingTokenFeature;
    constructor(
        recipeInterfaceImpl: RecipeInterface,
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
        input: import("../../../types").TypeEmailPasswordPasswordResetEmailDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
