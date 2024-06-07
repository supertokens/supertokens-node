import Session from "../../../recipe/session";

export async function handleSession(
    session: { [key: string]: any } | undefined
): Promise<Session.SessionContainer | undefined> {
    if (session !== undefined) {
        return await Session.getSessionWithoutRequestResponse(
            session.accessToken,
            session.userDataInAccessToken?.antiCsrfToken
        );
    }
    return session;
}
