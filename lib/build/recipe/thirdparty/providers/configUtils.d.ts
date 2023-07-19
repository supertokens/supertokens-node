// @ts-nocheck
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
    userContext: any
): Promise<TypeProvider | undefined>;
export declare function mergeConfig(staticConfig: ProviderConfig, coreConfig: ProviderConfig): ProviderConfig;
export declare function mergeProvidersFromCoreAndStatic(
    providerConfigsFromCore: ProviderConfig[],
    providerInputsFromStatic: ProviderInput[]
): ProviderInput[];
