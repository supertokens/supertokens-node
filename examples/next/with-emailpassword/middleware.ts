import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Session, { SessionContainer } from "supertokens-node/recipe/session";
import supertokens from "supertokens-node";
import { backendConfig } from "./config/backendConfig";

supertokens.init(backendConfig());

export async function middleware(request: NextRequest & { session?: SessionContainer }) {
    if (request.nextUrl.pathname.startsWith("/api/auth")) {
        // this hits our pages/api/auth/* endpoints
        return NextResponse.next();
    }

    return withSession(request, async (session) => {
        if (session === undefined) {
            return NextResponse.next();
        }
        return NextResponse.next({
            headers: {
                "x-user-id": session.getUserId(),
            },
        });
    });
}

export const config = {
    matcher: "/api/:path*",
};

export async function withSession(
    request: NextRequest,
    handler: (session: SessionContainer | undefined) => Promise<NextResponse>
) {
    try {
        const token = request.cookies.get("sAccessToken");
        if (token === undefined) {
            return handler(undefined);
        }
        const accessToken = token.value;
        let session = await Session.getSessionWithoutRequestResponse(accessToken, undefined, {
            sessionRequired: false,
        });
        let response = await handler(session);
        if (session !== undefined) {
            let tokens = session.getAllSessionTokensDangerously();
            if (tokens.accessAndFrontTokenUpdated) {
                response.cookies.set({
                    name: "sAccessToken",
                    value: tokens.accessToken,
                    httpOnly: true,
                    path: "/",
                    expires: Date.now() + 3153600000000,
                });
                response.headers.append("front-token", tokens.frontToken);
            }
        }
        return response;
    } catch (err) {
        if (Session.Error.isErrorFromSuperTokens(err)) {
            return new Response("Authentication required", {
                status: err.type === Session.Error.INVALID_CLAIMS ? 403 : 401,
            });
        }
        throw err;
    }
}
