// @ts-nocheck
import RecipeModule from "./recipeModule";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import { TypeFramework } from "./framework/types";
import { RecipeLevelUser } from "./recipe/accountlinking/types";
import { BaseRequest, BaseResponse } from "./framework";
import type { TypeInput as AccountLinkingTypeInput } from "./recipe/accountlinking/types";
import type { TypeInput as DashboardTypeInput } from "./recipe/dashboard/types";
import type { TypeInput as EmailPasswordTypeInput } from "./recipe/emailpassword/types";
import type { TypeInput as EmailVerificationTypeInput } from "./recipe/emailverification/types";
import type { TypeInput as JWTTypeInput } from "./recipe/jwt/types";
import type { TypeInput as MultifactorAuthTypeInput } from "./recipe/multifactorauth/types";
import type { TypeInput as MultitenancyTypeInput } from "./recipe/multitenancy/types";
import type { TypeInput as OAuth2ProviderTypeInput } from "./recipe/oauth2provider/types";
import type { TypeInput as OpenIdTypeInput } from "./recipe/openid/types";
import type { TypeInput as PasswordlessTypeInput } from "./recipe/passwordless/types";
import type {
    SessionContainerInterface,
    TypeInput as SessionTypeInput,
    VerifySessionOptions,
} from "./recipe/session/types";
import type { TypeInput as ThirdPartyTypeInput } from "./recipe/thirdparty/types";
import type { TypeInput as TotpTypeInput } from "./recipe/totp/types";
import type { TypeInput as UserMetadataTypeInput } from "./recipe/usermetadata/types";
import type { TypeInput as UserRolesTypeInput } from "./recipe/userroles/types";
import type { TypeInput as WebauthnTypeInput } from "./recipe/webauthn/types";
declare const __brand: unique symbol;
type Brand<B> = {
    [__brand]: B;
};
type Branded<T, B> = T & Brand<B>;
export type NonNullableProperties<T> = {
    [P in keyof T]: NonNullable<T[P]>;
};
export type Entries<T> = {
    [K in keyof T]-?: [K, T[K]];
}[keyof T][];
export type UserContext = Branded<Record<string, any>, "UserContext">;
export type AppInfo = {
    appName: string;
    websiteDomain?: string;
    origin?: string | ((input: { request: BaseRequest | undefined; userContext: UserContext }) => string);
    websiteBasePath?: string;
    apiDomain: string;
    apiBasePath?: string;
    apiGatewayPath?: string;
};
export type NormalisedAppinfo = {
    appName: string;
    getOrigin: (input: { request: BaseRequest | undefined; userContext: UserContext }) => NormalisedURLDomain;
    apiDomain: NormalisedURLDomain;
    topLevelAPIDomain: string;
    getTopLevelWebsiteDomain: (input: { request: BaseRequest | undefined; userContext: UserContext }) => string;
    apiBasePath: NormalisedURLPath;
    apiGatewayPath: NormalisedURLPath;
    websiteBasePath: NormalisedURLPath;
};
export type SuperTokensInfo = {
    connectionURI: string;
    apiKey?: string;
    networkInterceptor?: NetworkInterceptor;
    disableCoreCallCache?: boolean;
};
export type AllRecipeConfigs = {
    accountlinking: AccountLinkingTypeInput & {
        override?: {
            apis?: never;
        };
    };
    dashboard: DashboardTypeInput;
    emailpassword: EmailPasswordTypeInput;
    emailverification: EmailVerificationTypeInput;
    jwt: JWTTypeInput;
    multifactorauth: MultifactorAuthTypeInput;
    multitenancy: MultitenancyTypeInput;
    oauth2provider: OAuth2ProviderTypeInput;
    openid: OpenIdTypeInput;
    passwordless: PasswordlessTypeInput;
    session: SessionTypeInput;
    thirdparty: ThirdPartyTypeInput;
    totp: TotpTypeInput;
    usermetadata: UserMetadataTypeInput;
    userroles: UserRolesTypeInput;
    webauthn: WebauthnTypeInput;
};
export type RecipePluginOverride<T extends keyof AllRecipeConfigs> = {
    functions?: NonNullable<AllRecipeConfigs[T]["override"]>["functions"];
    apis?: NonNullable<AllRecipeConfigs[T]["override"]>["apis"];
    config?: (config: AllRecipeConfigs[T]) => AllRecipeConfigs[T];
};
export type PluginRouteHandler = {
    method: HTTPMethod;
    path: string;
    verifySessionOptions?: VerifySessionOptions;
    handler: (
        req: BaseRequest,
        res: BaseResponse,
        session: SessionContainerInterface | undefined,
        userContext: UserContext
    ) => Promise<{
        status: number;
        body: JSONObject;
    } | null>;
};
export type SuperTokensPlugin = {
    id: string;
    version?: string;
    compatibleSDKVersions?: string | string[];
    init?: (config: SuperTokensPublicConfig, allPlugins: SuperTokensPublicPlugin[], sdkVersion: string) => void;
    dependencies?: (
        config: SuperTokensPublicConfig,
        pluginsAbove: SuperTokensPublicPlugin[],
        sdkVersion: string
    ) =>
        | {
              status: "OK";
              pluginsToAdd?: SuperTokensPlugin[];
          }
        | {
              status: "ERROR";
              message: string;
          };
    overrideMap?: {
        [recipeId in keyof AllRecipeConfigs]?: RecipePluginOverride<recipeId> & {
            recipeInitRequired?: boolean | ((sdkVersion: string) => boolean);
        };
    };
    routeHandlers?:
        | ((
              config: SuperTokensPublicConfig,
              allPlugins: SuperTokensPublicPlugin[],
              sdkVersion: string
          ) =>
              | {
                    status: "OK";
                    routeHandlers: PluginRouteHandler[];
                }
              | {
                    status: "ERROR";
                    message: string;
                })
        | PluginRouteHandler[];
    config?: (config: SuperTokensPublicConfig) => Omit<SuperTokensPublicConfig, "appInfo"> | undefined;
    exports?: Record<string, any>;
};
export type SuperTokensPublicPlugin = Pick<
    SuperTokensPlugin,
    "id" | "version" | "compatibleSDKVersions" | "exports"
> & {
    initialized: boolean;
};
export declare const nonPublicConfigProperties: readonly ["recipeList", "experimental"];
export type NonPublicConfigPropertiesType = typeof nonPublicConfigProperties[number];
export type SuperTokensConfigWithNormalisedAppInfo = Omit<TypeInput, "appInfo"> & {
    appInfo: NormalisedAppinfo;
};
export type SuperTokensPublicConfig = Omit<Omit<TypeInput, NonPublicConfigPropertiesType>, "appInfo"> & {
    appInfo: NormalisedAppinfo;
};
export type TypeInput = {
    supertokens?: SuperTokensInfo;
    framework?: TypeFramework;
    appInfo: AppInfo;
    recipeList: RecipeListFunction[];
    telemetry?: boolean;
    isInServerlessEnv?: boolean;
    debug?: boolean;
    /**
     *
     * Our experimental features are not yet stable and are subject to change. In practical terms, this means that their interface is subject to change without a major version update.
     * They are also not tested as much as our "normal" features.
     *
     * If you want to use these features, or if you have any feedback please let us know at:
     * https://supertokens.com/discord
     *
     */
    experimental?: {
        plugins?: SuperTokensPlugin[];
    };
};
export type NetworkInterceptor = (request: HttpRequest, userContext: UserContext) => HttpRequest;
export interface HttpRequest {
    url: string;
    method: HTTPMethod;
    headers: {
        [key: string]: string | number | string[];
    };
    params?: Record<string, boolean | number | string | undefined>;
    body?: any;
}
export type RecipeListFunction = (
    appInfo: NormalisedAppinfo,
    isInServerlessEnv: boolean,
    overrideMaps: NonNullable<SuperTokensPlugin["overrideMap"]>[]
) => RecipeModule;
export type APIHandled = {
    pathWithoutApiBasePath: NormalisedURLPath;
    method: HTTPMethod;
    id: string;
    disabled: boolean;
};
export type HTTPMethod = "post" | "get" | "delete" | "put" | "patch" | "options" | "trace";
export type JSONPrimitive = string | number | boolean | null;
export type JSONArray = Array<JSONValue>;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray | undefined;
export interface JSONObject {
    [ind: string]: JSONValue;
}
export type GeneralErrorResponse = {
    status: "GENERAL_ERROR";
    message: string;
};
export type User = {
    id: string;
    timeJoined: number;
    isPrimaryUser: boolean;
    tenantIds: string[];
    emails: string[];
    phoneNumbers: string[];
    thirdParty: {
        id: string;
        userId: string;
    }[];
    webauthn: {
        credentialIds: string[];
    };
    loginMethods: (RecipeLevelUser & {
        verified: boolean;
        hasSameEmailAs: (email: string | undefined) => boolean;
        hasSamePhoneNumberAs: (phoneNumber: string | undefined) => boolean;
        hasSameThirdPartyInfoAs: (thirdParty?: { id: string; userId: string }) => boolean;
        hasSameWebauthnInfoAs: (webauthn?: { credentialId: string }) => boolean;
        toJson: () => any;
    })[];
    toJson: () => any;
};
export {};
