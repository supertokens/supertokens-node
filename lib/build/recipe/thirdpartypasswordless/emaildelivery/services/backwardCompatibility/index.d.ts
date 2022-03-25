// @ts-nocheck
import { TypeThirdPartyPasswordlessEmailDeliveryInput, User, RecipeInterface } from "../../../types";
import { NormalisedAppinfo } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeThirdPartyPasswordlessEmailDeliveryInput> {
    private recipeInterfaceImpl;
    private isInServerlessEnv;
    private appInfo;
    private emailVerificationBackwardCompatibilityService;
    private passwordlessBackwardCompatibilityService;
    constructor(
        recipeInterfaceImpl: RecipeInterface,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
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
            | (import("../../../../passwordless/types").TypePasswordlessEmailDeliveryInput & {
                  userContext: any;
              })
    ) => Promise<void>;
}
