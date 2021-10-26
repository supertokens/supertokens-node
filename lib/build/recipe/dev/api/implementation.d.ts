// @ts-nocheck
import { APIInterface } from "../";
import { HealthCheckResponse, TypeNormalisedInput } from "../types";
export default class APIImplementation implements APIInterface {
    healthCheckGET: (input: TypeNormalisedInput) => Promise<HealthCheckResponse>;
}
