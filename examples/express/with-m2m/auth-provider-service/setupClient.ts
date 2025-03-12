import { readFile, writeFile } from "fs/promises";
import OAuth2Provider from "supertokens-node/recipe/oauth2provider";

export async function setupClient() {
    let clients: Record<string, { clientId: string; clientSecret: string | undefined }> = {};
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
