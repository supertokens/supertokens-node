// @ts-nocheck
import { APIInterface } from "../";
import { HealthCheckResponse, TypeInput } from "../types";
export default class APIImplementation implements APIInterface {
    healthCheckGET: (input: TypeInput) => Promise<HealthCheckResponse>;
}
