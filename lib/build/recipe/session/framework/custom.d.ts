// @ts-nocheck
import type { VerifySessionOptions } from "..";
import type { BaseRequest, BaseResponse } from "../../../framework";
import type { NextFunction } from "../../../framework/custom/framework";
import { SessionContainerInterface } from "../types";
export declare function verifySession<
    T extends BaseRequest & {
        session?: SessionContainerInterface;
    }
>(options?: VerifySessionOptions): (req: T, res: BaseResponse, next?: NextFunction) => Promise<any>;
