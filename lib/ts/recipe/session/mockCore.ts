import NormalisedURLPath from "../../normalisedURLPath";

export async function mockGetRefreshAPIResponse(requestBody: any, querier: any) {
    let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/session/refresh"), requestBody);
    if (response.status === "OK") {
        response.session.recipeUserId = response.session.userId;
        return response;
    } else if (response.status === "UNAUTHORISED") {
        return response;
    } else {
        response.session.recipeUserId = response.session.userId;
        return response;
    }
}

export async function mockCreateNewSession(requestBody: any, querier: any) {
    let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/session"), requestBody);
    response.session.recipeUserId = response.session.userId;
    return response;
}

export async function mockGetSession(requestBody: any, querier: any) {
    let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/session/verify"), requestBody);
    if (response.status === "OK") {
        response.session.recipeUserId = response.session.userId;
        return response;
    } else {
        return response;
    }
}
