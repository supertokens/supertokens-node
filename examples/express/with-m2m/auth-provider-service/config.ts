import OAuth2Provider from "supertokens-node/recipe/oauth2provider";
import Session from "supertokens-node/recipe/session";
import { TypeInput } from "supertokens-node/types";
import { readFile, writeFile } from "fs/promises";

export const websitePort = process.env.REACT_APP_WEBSITE_PORT || 3000;
export const apiPort = process.env.REACT_APP_API_PORT || 3001;

export function getApiDomain() {
    const apiUrl = process.env.REACT_APP_API_URL || `http://localhost:${apiPort}`;
    return apiUrl;
}

export function getWebsiteDomain() {
    const websiteUrl = process.env.REACT_APP_WEBSITE_URL || `http://localhost:${websitePort}`;
    return websiteUrl;
}

export const SuperTokensConfig: TypeInput = {
    supertokens: {
        // this is the location of the SuperTokens core.
        // connectionURI: "https://try.supertokens.com",
        connectionURI: "http://localhost:3567",
    },
    appInfo: {
        appName: "Supertokens M2M Demo App - Auth Provider Service",
        apiDomain: getApiDomain(),
        websiteDomain: getWebsiteDomain(),
    },
    // recipeList contains all the modules that you want to
    // use from SuperTokens. See the full list here: https://supertokens.com/docs/guides
    recipeList: [OAuth2Provider.init(), Session.init()],
};

let clients: Record<string, { clientId: string; clientSecret: string | undefined }> = {};

export async function setupTenants() {
    try {
        const data = await readFile("../clients.json", "utf8");
        clients = JSON.parse(data);
    } catch (e) {
        console.error(e);
    }

    if (Object.keys(clients).length === 0) {
        const client = await OAuth2Provider.createOAuth2Client({
            clientName: "Assistant client",
            grantTypes: ["client_credentials"],
            scope: "note.read note.write calendar.read calendar.write",
            // It's good practice to make the audience values correspond to the url of the services, but it is not required
            // In this example we use more descriptive values, because they will be displayed later.
            audience: ["note-service", "calendar-service"],
        });
        if (client.status !== "OK") {
            throw new Error("Failed to create client");
        }
        clients["assistant"] = {
            clientId: client.client.clientId,
            clientSecret: client.client.clientSecret,
        };

        await writeFile("../clients.json", JSON.stringify(clients, null, 2));
    }
}
