import Session from '../recipe';
import type { VerifySessionOptions } from '../types';
import { H3Request, H3ResponseTokens } from '../../../framework/h3/framework';
import type { SessionRequest } from '../../../framework/h3';
import type { ServerResponse} from 'http';
import SuperTokens from '../../../supertokens';

export function verifySession(options?: VerifySessionOptions) {
    return async (req: SessionRequest, res: ServerResponse, next: (err?: Error) => any) => {
        const request = new H3Request(req);
        const response = new H3ResponseTokens(res);
        try {
            const sessionRecipe = Session.getInstanceOrThrowError();
            req.session = await sessionRecipe.verifySession(options, request, response);
            next();
        } catch (err: any) {
            try {
                const supertokens = SuperTokens.getInstanceOrThrowError();
                await supertokens.errorHandler(err, request, response);
            } catch(err: any) {
                next(err);
            }
        }
    }
}