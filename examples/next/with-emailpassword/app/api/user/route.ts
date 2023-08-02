import { NextResponse, NextRequest } from "next/server";
import { withSession } from "../../../middleware";

export async function GET(request: NextRequest) {
    return withSession(request, async (session) => {
        if (session === undefined) {
            return new NextResponse("Authentication required", {
                status: 401,
            });
        }
        return NextResponse.json({
            note: "Fetch any data from your application for authenticated user after using verifySession middleware",
            userId: session.getUserId(),
            sessionHandle: session.getHandle(),
            accessTokenPayload: session.getAccessTokenPayload(),
        });
    });
}
