// @ts-nocheck
import { TypeEmailPasswordEmailDeliveryInput, User } from "../../../types";
import { NormalisedAppinfo } from "../../../../../types";
import Recipe from "../../../recipe";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeEmailPasswordEmailDeliveryInput> {
    private recipeInstance;
    private appInfo;
    private resetPasswordUsingTokenFeature?;
    private emailVerificationFeature?;
    constructor(
        recipeInstance: Recipe,
        appInfo: NormalisedAppinfo,
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
            | (import("../../../types").TypeEmailPasswordPasswordResetEmailDeliveryInput & {
                  userContext: any;
              })
    ) => Promise<void>;
}
