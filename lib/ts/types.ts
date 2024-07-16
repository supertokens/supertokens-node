/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

import RecipeModule from "./recipeModule";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import { TypeFramework } from "./framework/types";
import { RecipeLevelUser } from "./recipe/accountlinking/types";
import { BaseRequest } from "./framework";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainer } from "./recipe/session";
declare const __brand: unique symbol;
type Brand<B> = { [__brand]: B };

type Branded<T, B> = T & Brand<B>;

// Record<string,any> is still quite generic and we would like to ensure type safety for the userContext
// so we use the concept of branded type, which enables catching of issues at compile time.
// Detailed explanation about branded types is available here - https://egghead.io/blog/using-branded-types-in-typescript
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

export type TypeInput = {
    supertokens?: SuperTokensInfo;
    framework?: TypeFramework;
    appInfo: AppInfo;
    recipeList: RecipeListFunction[];
    telemetry?: boolean;
    isInServerlessEnv?: boolean;
    debug?: boolean;
    security?: {
        googleRecaptcha?: {
            // if the user provides both, we will use v2
            v2SecretKey?: string;
            v1SecretKey?: string;
        };
        securityServiceApiKey?: string; // this will be used for bruteforce, anomaly, and breached password detection services.
        override?: (
            originalImplementation: SecurityFunctions,
            builder?: OverrideableBuilder<SecurityFunctions>
        ) => SecurityFunctions;
    };
};

export type InfoFromRequestHeaders = {
    ipAddress?: string;
    userAgent?: string;
};

export type SecurityChecksActionTypes =
    | "emailpassword-sign-in"
    | "emailpassword-sign-up"
    | "send-password-reset-email"
    | "passwordless-send-email"
    | "passwordless-send-sms"
    | "totp-verify-device"
    | "totp-verify-totp"
    | "thirdparty-login"
    | "emailverification-send-email";

export type RiskScores = {
    // all values are between 0 and 1, with 1 being highest risk
    requestIdInfo?:
        | {
              valid: true;
              identification: {
                  data: {
                      visitorId: string;
                      requestId: string;
                      incognito: boolean;
                      linkedId: string;
                      tag: Record<string, unknown>;
                      time: string;
                      timestamp: number;
                      url: string;
                      ip: string;
                      ipLocation: {
                          accuracyRadius: number;
                          latitude: number;
                          longitude: number;
                          postalCode: string;
                          timezone: string;
                          city: {
                              name: string;
                          };
                          country: {
                              code: string;
                              name: string;
                          };
                          continent: {
                              code: string;
                              name: string;
                          };
                          subdivisions: Array<{
                              isoCode: string;
                              name: string;
                          }>;
                      };
                      browserDetails: {
                          browserName: string;
                          browserMajorVersion: string;
                          browserFullVersion: string;
                          os: string;
                          osVersion: string;
                          device: string;
                          userAgent: string;
                      };
                      confidence: {
                          score: number;
                      };
                      visitorFound: boolean;
                      firstSeenAt: {
                          global: string;
                          subscription: string;
                      };
                      lastSeenAt: {
                          global: string | null;
                          subscription: string | null;
                      };
                  };
              };
              botd: {
                  data: {
                      bot: {
                          result: string;
                      };
                      url: string;
                      ip: string;
                      time: string;
                      userAgent: string;
                      requestId: string;
                  };
              };
              rootApps: {
                  data: {
                      result: boolean;
                  };
              };
              emulator: {
                  data: {
                      result: boolean;
                  };
              };
              ipInfo: {
                  data: {
                      v4: {
                          address: string;
                          geolocation: {
                              accuracyRadius: number;
                              latitude: number;
                              longitude: number;
                              postalCode: string;
                              timezone: string;
                              city: {
                                  name: string;
                              };
                              country: {
                                  code: string;
                                  name: string;
                              };
                              continent: {
                                  code: string;
                                  name: string;
                              };
                              subdivisions: Array<{
                                  isoCode: string;
                                  name: string;
                              }>;
                          };
                          asn: {
                              asn: string;
                              name: string;
                              network: string;
                          };
                          datacenter: {
                              result: boolean;
                              name: string;
                          };
                      };
                      v6: {
                          address: string;
                          geolocation: {
                              accuracyRadius: number;
                              latitude: number;
                              longitude: number;
                              postalCode: string;
                              timezone: string;
                              city: {
                                  name: string;
                              };
                              country: {
                                  code: string;
                                  name: string;
                              };
                              continent: {
                                  code: string;
                                  name: string;
                              };
                              subdivisions: Array<{
                                  isoCode: string;
                                  name: string;
                              }>;
                          };
                          asn: {
                              asn: string;
                              name: string;
                              network: string;
                          };
                          datacenter: {
                              result: boolean;
                              name: string;
                          };
                      };
                  };
              };
              ipBlocklist: {
                  data: {
                      result: boolean;
                      details: {
                          emailSpam: boolean;
                          attackSource: boolean;
                      };
                  };
              };
              tor: {
                  data: {
                      result: boolean;
                  };
              };
              vpn: {
                  data: {
                      result: boolean;
                      originTimezone: string;
                      originCountry: string;
                      methods: {
                          timezoneMismatch: boolean;
                          publicVPN: boolean;
                          auxiliaryMobile: boolean;
                          osMismatch: boolean;
                      };
                  };
              };
              proxy: {
                  data: {
                      result: boolean;
                  };
              };
              incognito: {
                  data: {
                      result: boolean;
                  };
              };
              tampering: {
                  data: {
                      result: boolean;
                      anomalyScore: number;
                  };
              };
              clonedApp: {
                  data: {
                      result: boolean;
                  };
              };
              factoryReset: {
                  data: {
                      time: string;
                      timestamp: number;
                  };
              };
              jailbroken: {
                  data: {
                      result: boolean;
                  };
              };
              frida: {
                  data: {
                      result: boolean;
                  };
              };
              privacySettings: {
                  data: {
                      result: boolean;
                  };
              };
              virtualMachine: {
                  data: {
                      result: boolean;
                  };
              };
              rawDeviceAttributes: {
                  data: {
                      architecture: {
                          value: number;
                      };
                      audio: {
                          value: number;
                      };
                      canvas: {
                          value: {
                              Winding: boolean;
                              Geometry: string;
                              Text: string;
                          };
                      };
                      colorDepth: {
                          value: number;
                      };
                      colorGamut: {
                          value: string;
                      };
                      contrast: {
                          value: number;
                      };
                      cookiesEnabled: {
                          value: boolean;
                      };
                      cpuClass: Record<string, unknown>;
                      fonts: {
                          value: string[];
                      };
                  };
              };
              highActivity: {
                  data: {
                      result: boolean;
                  };
              };
              locationSpoofing: {
                  data: {
                      result: boolean;
                  };
              };
              remoteControl: {
                  data: {
                      result: boolean;
                  };
              };
          }
        | {
              valid: false;
          };
    phoneNumberRisk?: number;
    emailRisk?: number;
    isBreachedPassword?: boolean;
    bruteForce?:
        | {
              detected: false;
          }
        | {
              detected: true;
              key: string;
          };
};

export type SecurityFunctions = {
    getInfoFromRequest: (input: {
        tenantId: string;
        request: BaseRequest;
        userContext: UserContext;
    }) => InfoFromRequestHeaders;

    // this function will return hasProvidedV2SecretKey || hasProvidedV1SecretKey by default.
    shouldEnforceGoogleRecaptchaTokenPresentInRequest: (input: {
        tenantId: string;
        actionType: SecurityChecksActionTypes;
        userContext: UserContext;
    }) => Promise<boolean>;

    performGoogleRecaptchaV2: (input: {
        tenantId: string;
        infoFromRequest: InfoFromRequestHeaders;
        googleRecaptchaToken: string;
        userContext: UserContext;
    }) => Promise<boolean>;

    performGoogleRecaptchaV1: (input: {
        tenantId: string;
        infoFromRequest: InfoFromRequestHeaders;
        googleRecaptchaToken: string;
        userContext: UserContext;
    }) => Promise<boolean>;

    // this will return true if securityServiceApiKey is present in the config.
    shouldEnforceSecurityServiceRequestIdPresentInRequest: (input: {
        tenantId: string;
        actionType: SecurityChecksActionTypes;
        userContext: UserContext;
    }) => Promise<boolean>;

    // we pass in password instead of passwordHash cause maybe users want to use a different way to
    // check for breached password.
    getRiskScoresFromSecurityService: (input: {
        tenantId: string;
        infoFromRequestHeaders?: InfoFromRequestHeaders;
        password?: string; // to check against breached password
        securityServiceRequestId?: string;
        email?: string;
        phoneNumber?: string;
        bruteForce?: {
            key: string;
            maxRequests: {
                limit: number;
                perTimeIntervalMS: number;
            }[];
        }[];
        actionType?: SecurityChecksActionTypes;
        userContext: UserContext;
    }) => Promise<RiskScores | undefined>; // undefined means we have nothing to return, and we completely ignore this.

    shouldRejectRequestBasedOnRiskScores: (input: {
        tenantId: string;
        riskScores: RiskScores;
        actionType: SecurityChecksActionTypes;
        userContext: UserContext;
    }) => Promise<{
        rejectBasedOnBruteForce?: boolean;
        rejectBasedOnBreachedPassword?: boolean;
        rejectBasedOnBotDetection?: boolean;
        rejectBasedOnSuspiciousIPOrLocation?: boolean;
        rejectBasedOnVPNBeingUsed?: boolean;
        rejectBasedOnPhoneNumberRisk?: boolean;
        rejectBasedOnEmailRisk?: boolean;
        otherReasonForRejection?: string;
    }>;

    // these are all here and not in the respective recipes cause they are to be applied
    // only in the APIs and not in the recipe function. We still can't put them in the API
    // cause for third party, we do not have the thirdPartyInfo in the api args in the input.

    // Note that for passwordless, we will call this during createCode.
    getRateLimitForEmailPasswordSignIn: (input: {
        tenantId: string;
        session?: SessionContainer;
        email: string;
        infoFromRequest: InfoFromRequestHeaders;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              maxRequests: {
                  limit: number;
                  perTimeIntervalMS: number;
              }[];
          }[] // is an array so that we can have multiple checks and fail the api if any one of them fail
        | undefined; // undefined means no rate limit
    getRateLimitForEmailPasswordSignUp: (input: {
        tenantId: string;
        session?: SessionContainer;
        email: string;
        infoFromRequest: InfoFromRequestHeaders;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              maxRequests: {
                  limit: number;
                  perTimeIntervalMS: number;
              }[];
          }[]
        | undefined;
    getRateLimitForThirdPartySignInUp: (input: {
        tenantId: string;
        session?: SessionContainer;
        thirdPartyId: string; // we intentionally do not give thirdPartyUserId because if we did, we'd have to query the thirdParty provider first
        infoFromRequest: InfoFromRequestHeaders;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              maxRequests: {
                  limit: number;
                  perTimeIntervalMS: number;
              }[];
          }[]
        | undefined;
    getRateLimitForSendingPasswordlessEmail: (input: {
        tenantId: string;
        session?: SessionContainer;
        email: string;
        infoFromRequest: InfoFromRequestHeaders;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              maxRequests: {
                  limit: number;
                  perTimeIntervalMS: number;
              }[];
          }[]
        | undefined;
    getRateLimitForSendingPasswordlessSms: (input: {
        tenantId: string;
        session?: SessionContainer;
        phoneNumber: string;
        infoFromRequest: InfoFromRequestHeaders;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              maxRequests: {
                  limit: number;
                  perTimeIntervalMS: number;
              }[];
          }[]
        | undefined;
    getRateLimitForResetPassword: (input: {
        tenantId: string;
        email: string;
        infoFromRequest: InfoFromRequestHeaders;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              maxRequests: {
                  limit: number;
                  perTimeIntervalMS: number;
              }[];
          }[]
        | undefined;
    getRateLimitForVerifyEmail: (input: {
        tenantId: string;
        session: SessionContainer;
        // we intentionally do not pass in the email here cause to fetch that, we'd need to query the core first
        infoFromRequest: InfoFromRequestHeaders;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              maxRequests: {
                  limit: number;
                  perTimeIntervalMS: number;
              }[];
          }[]
        | undefined;

    getRateLimitForTotpDeviceVerify: (input: {
        tenantId: string;
        session: SessionContainer;
        deviceName: string;
        infoFromRequest: InfoFromRequestHeaders;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              maxRequests: {
                  limit: number;
                  perTimeIntervalMS: number;
              }[];
          }[]
        | undefined;

    getRateLimitForTotpVerify: (input: {
        tenantId: string;
        session: SessionContainer;
        deviceName: string;
        infoFromRequest: InfoFromRequestHeaders;
        userContext: UserContext;
    }) =>
        | {
              key: string;
              maxRequests: {
                  limit: number;
                  perTimeIntervalMS: number;
              }[];
          }[]
        | undefined;

    // if tenant id is not provided, then we ban across all tenants.
    ban: (input: {
        tenantId?: string;
        userId?: string; // can be a primary or recipe user id, either way, the primary user id is banned
        ipAddress?: string;
        email?: string;
        phoneNumber?: string;
        userContext: UserContext;
    }) => Promise<void>;

    getIsBanned: (input: {
        tenantId?: string;
        userId?: string; // can be a primary or recipe user id, either way, the primary user id is banned
        ipAddress?: string;
        email?: string;
        phoneNumber?: string;
        userContext: UserContext;
    }) => Promise<{
        userIdBanned?: boolean;
        ipAddressBanned?: boolean;
        emailBanned?: boolean;
        phoneNumberBanned?: boolean;
    }>;

    unban: (input: {
        tenantId?: string;
        userId?: string; // can be a primary or recipe user id, either way, the primary user id is banned
        ipAddress?: string;
        email?: string;
        phoneNumber?: string;
        userContext: UserContext;
    }) => Promise<void>;
};

export type NetworkInterceptor = (request: HttpRequest, userContext: UserContext) => HttpRequest;

export interface HttpRequest {
    url: string;
    method: HTTPMethod;
    headers: { [key: string]: string | number | string[] };
    params?: Record<string, boolean | number | string | undefined>;
    body?: any;
}

export type RecipeListFunction = (appInfo: NormalisedAppinfo, isInServerlessEnv: boolean) => RecipeModule;

export type APIHandled = {
    pathWithoutApiBasePath: NormalisedURLPath;
    method: HTTPMethod;
    id: string;
    disabled: boolean;
};

export type HTTPMethod = "post" | "get" | "delete" | "put" | "options" | "trace";

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
    id: string; // primaryUserId or recipeUserId
    timeJoined: number; // minimum timeJoined value from linkedRecipes
    isPrimaryUser: boolean;
    tenantIds: string[];
    emails: string[];
    phoneNumbers: string[];
    thirdParty: {
        id: string;
        userId: string;
    }[];
    loginMethods: (RecipeLevelUser & {
        verified: boolean;
        hasSameEmailAs: (email: string | undefined) => boolean;
        hasSamePhoneNumberAs: (phoneNumber: string | undefined) => boolean;
        hasSameThirdPartyInfoAs: (thirdParty?: { id: string; userId: string }) => boolean;
        toJson: () => any;
    })[];

    // this function will be used in the send200Response function in utils to
    // convert this object to JSON before sending it to the client. So that in RecipeLevelUser
    // the recipeUserId can be converted to string from the RecipeUserId object type.
    toJson: () => any;
};
