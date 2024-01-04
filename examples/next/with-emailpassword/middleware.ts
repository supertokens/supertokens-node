import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SessionContainer } from "supertokens-node/recipe/session";
import supertokens from "supertokens-node";
import { backendConfig } from "./config/backendConfig";
import { withSession } from "supertokens-node/nextjs";

supertokens.init(backendConfig());

export async function middleware(request: NextRequest & { session?: SessionContainer }) {
    if (request.nextUrl.pathname.startsWith("/api/auth")) {
        // this hits our pages/api/auth/* endpoints
        return NextResponse.next();
    }

    return withSession(request, async (err, session) => {
        if (err) return NextResponse.json(err, { status: 500 });
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
