// @ts-nocheck
import { NormalisedAppinfo } from "../../../types";
import { RecipeInterface as OpenIdRecipeInterface } from "../../openid/types";
import { SessionContainerInterface } from "../types";
export default class SessionClassWithJWT implements SessionContainerInterface {
    private openIdRecipeImplementation;
    private originalSessionClass;
    private appInfo;
    constructor(
        originalSessionClass: SessionContainerInterface,
        openIdRecipeImplementation: OpenIdRecipeInterface,
        appInfo: NormalisedAppinfo
    );
    revokeSession: () => Promise<void>;
    getSessionData: () => Promise<any>;
    updateSessionData: (newSessionData: any) => Promise<any>;
    getUserId: () => string;
    getAccessTokenPayload: () => any;
    getHandle: () => string;
    getAccessToken: () => string;
    getTimeCreated: () => Promise<number>;
    getExpiry: () => Promise<number>;
    updateAccessTokenPayload: (newAccessTokenPayload: any) => Promise<void>;
}
