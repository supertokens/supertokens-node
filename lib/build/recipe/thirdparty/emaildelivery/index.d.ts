// @ts-nocheck
import { TypeThirdPartyEmailDeliveryInput, User } from "../types";
import { User as EmailVerificationUser } from "../../emailverification/types";
import { NormalisedAppinfo } from "../../../types";
import Recipe from "../recipe";
export declare function getNormaliseAndInvokeDefaultCreateAndSendCustomEmail(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    input: TypeThirdPartyEmailDeliveryInput,
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
    input: TypeThirdPartyEmailDeliveryInput,
    isInServerlessEnv: boolean,
    emailVerificationFeature?: {
        createAndSendCustomEmail?: (
            user: EmailVerificationUser,
            emailVerificationURLWithToken: string,
            userContext: any
        ) => Promise<void>;
    }
): Promise<void>;
