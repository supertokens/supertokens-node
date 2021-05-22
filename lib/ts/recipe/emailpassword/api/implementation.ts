import { APIInterface, APIOptions, User } from "../";
import Session, { SessionContainer } from "../../session";
import STError from "../error";

export default class APIImplementation implements APIInterface {
    emailExistsGET = async (
        email: string,
        options: APIOptions
    ): Promise<{
        status: "OK";
        exists: boolean;
    }> => {
        let user = await options.recipeImplementation.getUserByEmail(email);

        return {
            status: "OK",
            exists: user !== undefined,
        };
    };

    generatePasswordResetTokenPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        options: APIOptions
    ): Promise<{
        status: "OK";
    }> => {
        let email = formFields.filter((f) => f.id === "email")[0].value;

        let user = await options.recipeImplementation.getUserByEmail(email);
        if (user === undefined) {
            return {
                status: "OK",
            };
        }

        let token: string;
        try {
            token = await options.recipeImplementation.createResetPasswordToken(user.id);
        } catch (err) {
            if (STError.isErrorFromSuperTokens(err) && err.type === STError.UNKNOWN_USER_ID_ERROR) {
                return {
                    status: "OK",
                };
            }
            throw err;
        }

        let passwordResetLink =
            (await options.config.resetPasswordUsingTokenFeature.getResetPasswordURL(user)) +
            "?token=" +
            token +
            "&rid=" +
            options.recipeId;

        try {
            options.config.resetPasswordUsingTokenFeature
                .createAndSendCustomEmail(user, passwordResetLink)
                .catch((_) => {});
        } catch (ignored) {}

        return {
            status: "OK",
        };
    };

    passwordResetPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        token: string,
        options: APIOptions
    ): Promise<{
        status: "OK";
    }> => {
        let newPassword = formFields.filter((f) => f.id === "password")[0].value;

        await options.recipeImplementation.resetPasswordUsingToken(token, newPassword);

        // step 3
        return {
            status: "OK",
        };
    };

    signInPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        options: APIOptions
    ): Promise<{
        status: "OK";
        user: User;
    }> => {
        let email = formFields.filter((f) => f.id === "email")[0].value;
        let password = formFields.filter((f) => f.id === "password")[0].value;

        let user = await options.recipeImplementation.signIn(email, password);

        await options.config.signInFeature.handlePostSignIn(user);

        let jwtPayloadPromise = options.config.sessionFeature.setJwtPayload(user, formFields, "signin");
        let sessionDataPromise = options.config.sessionFeature.setSessionData(user, formFields, "signin");

        let jwtPayload: { [key: string]: any } | undefined = undefined;
        let sessionData: { [key: string]: any } | undefined = undefined;
        try {
            jwtPayload = await jwtPayloadPromise;
            sessionData = await sessionDataPromise;
        } catch (err) {
            throw new STError({
                type: STError.GENERAL_ERROR,
                payload: err,
            });
        }

        await Session.createNewSession(options.res, user.id, jwtPayload, sessionData);
        return {
            status: "OK",
            user,
        };
    };

    signOutPOST = async (
        options: APIOptions
    ): Promise<{
        status: "OK";
    }> => {
        let session: SessionContainer | undefined;
        try {
            session = await Session.getSession(options.req, options.res);
        } catch (err) {
            if (Session.Error.isErrorFromSuperTokens(err) && err.type === Session.Error.UNAUTHORISED) {
                // The session is expired / does not exist anyway. So we return OK
                return {
                    status: "OK",
                };
            }
            throw err;
        }

        if (session === undefined) {
            throw new Session.Error({
                type: Session.Error.GENERAL_ERROR,
                payload: new Error("Session is undefined. Should not come here."),
            });
        }

        await session.revokeSession();

        return {
            status: "OK",
        };
    };

    signUpPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        options: APIOptions
    ): Promise<{
        status: "OK";
        user: User;
    }> => {
        let email = formFields.filter((f) => f.id === "email")[0].value;
        let password = formFields.filter((f) => f.id === "password")[0].value;

        let user = await options.recipeImplementation.signUp(email, password);

        await options.config.signUpFeature.handlePostSignUp(user, formFields);

        let jwtPayloadPromise = options.config.sessionFeature.setJwtPayload(user, formFields, "signup");
        let sessionDataPromise = options.config.sessionFeature.setSessionData(user, formFields, "signup");

        let jwtPayload: { [key: string]: any } | undefined = undefined;
        let sessionData: { [key: string]: any } | undefined = undefined;
        try {
            jwtPayload = await jwtPayloadPromise;
            sessionData = await sessionDataPromise;
        } catch (err) {
            throw new STError({
                type: STError.GENERAL_ERROR,
                payload: err,
            });
        }

        await Session.createNewSession(options.res, user.id, jwtPayload, sessionData);
        return {
            status: "OK",
            user,
        };
    };
}
