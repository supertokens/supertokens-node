// @ts-nocheck
import { TypeThirdPartyEmailPasswordEmailDeliveryInput, User } from "../types";
import { User as EmailVerificationUser } from "../../emailverification/types";
import { NormalisedAppinfo } from "../../../types";
import Recipe from "../recipe";
export declare function getNormaliseAndInvokeDefaultCreateAndSendCustomEmail(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    input: TypeThirdPartyEmailPasswordEmailDeliveryInput,
    resetPasswordUsingTokenFeature?: {
        createAndSendCustomEmail?: (user: User, passwordResetURLWithToken: string, userContext: any) => Promise<void>;
    },
    emailVerificationFeature?: {
        createAndSendCustomEmail?: (
            user: User,
            emailVerificationURLWithToken: string,
            userContext: any
        ) => Promise<void>;
    }
): Promise<void>;
export declare function normaliseAndInvokeDefaultCreateAndSendCustomEmail(
    appInfo: NormalisedAppinfo,
    input: TypeThirdPartyEmailPasswordEmailDeliveryInput,
    isInServerlessEnv: boolean,
    resetPasswordUsingTokenFeature?: {
        createAndSendCustomEmail?: (user: User, passwordResetURLWithToken: string, userContext: any) => Promise<void>;
    },
    emailVerificationFeature?: {
        createAndSendCustomEmail?: (
            user: EmailVerificationUser,
            emailVerificationURLWithToken: string,
            userContext: any
        ) => Promise<void>;
    }
): Promise<void>;
