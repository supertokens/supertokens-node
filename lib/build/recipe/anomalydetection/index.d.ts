// @ts-nocheck
import Recipe from "./recipe";
import { RecipeInterface } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static checkForAnomaly(
        request: any,
        userId: string,
        userContext?: any
    ): Promise<{
        status: "ANOMALY_DETECTED" | "NO_ANOMALY_DETECTED" | "ANOMALY_SERVICE_ERROR";
        anomalyDetected: boolean;
        message: string;
    }>;
    static getInstance(): Recipe | undefined;
}
export declare const init: typeof Recipe.init;
export declare const checkForAnomaly: typeof Wrapper.checkForAnomaly;
export type { RecipeInterface };
