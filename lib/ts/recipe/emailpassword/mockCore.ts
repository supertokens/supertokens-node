import type { User } from "../../types";
import axios from "axios";

export async function mockCreateRecipeUser(input: {
    email: string;
    password: string;
    userContext: any;
}): Promise<
    | {
          status: "OK";
          user: User;
      }
    | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
> {
    let response = await axios(`http://localhost:8080/recipe/signup`, {
        method: "post",
        headers: {
            rid: "emailpassword",
            "content-type": "application/json",
        },
        data: {
            email: input.email,
            password: input.password,
        },
    });

    if (response.data.status === "EMAIL_ALREADY_EXISTS_ERROR") {
        return response.data;
    }

    let user = response.data.user;
    return {
        status: "OK",
        user: {
            id: user.id,
            emails: [user.email],
            timeJoined: user.timeJoined,
            isPrimaryUser: false,
            phoneNumbers: [],
            thirdParty: [],
            loginMethods: [
                {
                    recipeId: "emailpassword",
                    recipeUserId: user.id,
                    timeJoined: user.timeJoined,
                    verified: false,
                    email: user.email,
                },
            ],
        },
    };
}
