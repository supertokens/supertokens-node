import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { TypeNormalisedInput } from "./types";

export default function getRecipeInterface(querier: Querier, config: TypeNormalisedInput): RecipeInterface {
    return {
        createDevice: async (input: {
            userId: string;
            deviceName?: string;
            skew?: number;
            period?: number;
            userContext: any;
        }) => {
            return await querier.sendPostRequest(new NormalisedURLPath("/recipe/totp/device"), {
                userId: input.userId,
                deviceName: input.deviceName,
                skew: input.skew ?? config.defaultSkew,
                period: input.period ?? config.defaultPeriod,
                userContext: input.userContext,
            });
        },

        updateDevice: (input: {
            userId: string;
            existingDeviceName: string;
            newDeviceName: string;
            userContext: any;
        }) => {
            return querier.sendPutRequest(new NormalisedURLPath("/recipe/totp/device"), {
                userId: input.userId,
                deviceName: input.existingDeviceName,
                newDeviceName: input.newDeviceName,
                userContext: input.userContext,
            });
        },

        listDevices: (input: { userId: string; userContext: any }) => {
            return querier.sendGetRequest(new NormalisedURLPath("/recipe/totp/device/list"), {
                userId: input.userId,
                userContext: input.userContext,
            });
        },

        removeDevice: (input: { userId: string; deviceName: string; userContext: any }) => {
            return querier.sendPostRequest(new NormalisedURLPath("/recipe/totp/device/remove"), {
                userId: input.userId,
                deviceName: input.deviceName,
                userContext: input.userContext,
            });
        },

        verifyDevice: (input: {
            tenantId: string;
            userId: string;
            deviceName: string;
            totp: string;
            userContext: string;
        }) => {
            return querier.sendPostRequest(new NormalisedURLPath(`${input.tenantId}/recipe/totp/device/verify`), {
                userId: input.userId,
                deviceName: input.deviceName,
                totp: input.totp,
                userContext: input.userContext,
            });
        },

        verifyTOTP: (input: { tenantId: string; userId: string; totp: string; userContext: any }) => {
            return querier.sendPostRequest(new NormalisedURLPath(`${input.tenantId}/recipe/totp/verify`), {
                userId: input.userId,
                totp: input.totp,
                userContext: input.userContext,
            });
        },
    };
}
