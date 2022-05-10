// @ts-nocheck
import { TypeThirdPartyEmailPasswordEmailDeliveryInput, User, RecipeInterface } from "../../../types";
import { RecipeInterface as EmailPasswordRecipeInterface } from "../../../../emailpassword";
import { NormalisedAppinfo } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeThirdPartyEmailPasswordEmailDeliveryInput> {
    private emailPasswordBackwardCompatibilityService;
    private emailVerificationBackwardCompatibilityService;
    constructor(
        recipeInterfaceImpl: RecipeInterface,
        emailPasswordRecipeInterfaceImpl: EmailPasswordRecipeInterface,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        resetPasswordUsingTokenFeature?: {
            createAndSendCustomEmail?: (
                user: User,
                passwordResetURLWithToken: string,
                userContext: any
            ) => Promise<void>;
        },
        emailVerificationFeature?: {
            createAndSendCustomEmail?: (
                user: User,
                emailVerificationURLWithToken: string,
                userContext: any
            ) => Promise<void>;
        }
    );
    sendEmail: (
        input:
            | (import("../../../../emailverification/types").TypeEmailVerificationEmailDeliveryInput & {
                  userContext: any;
              })
            | (import("../../../../emailpassword/types").TypeEmailPasswordPasswordResetEmailDeliveryInput & {
                  userContext: any;
              })
    ) => Promise<void>;
}
