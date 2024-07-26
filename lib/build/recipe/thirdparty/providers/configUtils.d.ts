// @ts-nocheck
import { UserContext } from "../../../types";
import {
    ProviderClientConfig,
    ProviderConfig,
    ProviderConfigForClientType,
    ProviderInput,
    TypeProvider,
} from "../types";
export declare function getProviderConfigForClient(
    providerConfig: ProviderConfig,
    clientConfig: ProviderClientConfig
): ProviderConfigForClientType;
export declare function findAndCreateProviderInstance(
    providers: ProviderInput[],
    thirdPartyId: string,
    clientType: string | undefined,
    userContext: UserContext
): Promise<TypeProvider | undefined>;
export declare function mergeConfig(staticConfig: ProviderConfig, coreConfig: ProviderConfig): ProviderConfig;
export declare function mergeProvidersFromCoreAndStatic(
    providerConfigsFromCore: ProviderConfig[],
    providerInputsFromStatic: ProviderInput[],
    includeAllProviders: boolean
): ProviderInput[];
