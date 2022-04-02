import { SessionClaim } from "../types";
import { PrimitiveClaim } from "./primitiveClaim";

export class BooleanClaim extends PrimitiveClaim<boolean> {
    public readonly fetch: SessionClaim<boolean>["fetch"];

    constructor(conf: { id: string; fetch: SessionClaim<boolean>["fetch"] }) {
        super(conf.id);

        this.fetch = conf.fetch;
    }
}
