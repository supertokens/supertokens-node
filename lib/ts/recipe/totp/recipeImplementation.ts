import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { TypeNormalisedInput } from "./types";
import { UserContext } from "../../types";

export default function getRecipeInterface(querier: Querier, config: TypeNormalisedInput): RecipeInterface {
    return {
        createDevice: async (input: {
            userId: string;
            deviceName?: string;
            skew?: number;
            period?: number;
            userIdentifierInfo?: string;
            userContext: UserContext;
        }) => {
            const response = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/totp/device"),
                {
                    userId: input.userId,
                    deviceName: input.deviceName,
                    skew: input.skew ?? config.defaultSkew,
                    period: input.period ?? config.defaultPeriod,
                },
                input.userContext
            );

            return {
                ...response,
                qrCodeString:
                    `otpauth://totp/${encodeURI(config.issuer)}${
                        input.userIdentifierInfo !== undefined ? ":" + encodeURI(input.userIdentifierInfo) : ""
                    }` +
                    `?secret=${response.secret}&issuer=${encodeURI(config.issuer)}&digits=6&period=${
                        input.period ?? config.defaultPeriod
                    }`,
            };
        },

        updateDevice: (input: {
            userId: string;
            existingDeviceName: string;
            newDeviceName: string;
            userContext: UserContext;
        }) => {
            return querier.sendPutRequest(
                new NormalisedURLPath("/recipe/totp/device"),
                {
                    userId: input.userId,
                    existingDeviceName: input.existingDeviceName,
                    newDeviceName: input.newDeviceName,
                },
                input.userContext
            );
        },

        listDevices: (input: { userId: string; userContext: UserContext }) => {
            return querier.sendGetRequest(
                new NormalisedURLPath("/recipe/totp/device/list"),
                {
                    userId: input.userId,
                },
                input.userContext
            );
        },

        removeDevice: (input: { userId: string; deviceName: string; userContext: UserContext }) => {
            return querier.sendPostRequest(
                new NormalisedURLPath("/recipe/totp/device/remove"),
                {
                    userId: input.userId,
                    deviceName: input.deviceName,
                },
                input.userContext
            );
        },

        verifyDevice: (input: {
            tenantId: string;
            userId: string;
            deviceName: string;
            totp: string;
            userContext: UserContext;
        }) => {
            return querier.sendPostRequest(
                new NormalisedURLPath(`${input.tenantId}/recipe/totp/device/verify`),
                {
                    userId: input.userId,
                    deviceName: input.deviceName,
                    totp: input.totp,
                },
                input.userContext
            );
        },

        verifyTOTP: (input: { tenantId: string; userId: string; totp: string; userContext: UserContext }) => {
            return querier.sendPostRequest(
                new NormalisedURLPath(`${input.tenantId}/recipe/totp/verify`),
                {
                    userId: input.userId,
                    totp: input.totp,
                },
                input.userContext
            );
        },
    };
}
