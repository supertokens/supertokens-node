import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    let userId = request.headers.get("x-user-id");
    return NextResponse.json({
        userId,
    });
}
