import { readFile } from "fs/promises";

const authProviderBaseUrl = "http://localhost:3001";
const calendarServiceBaseUrl = "http://localhost:3011";
const noteServiceBaseUrl = "http://localhost:3012";

async function getAccessToken(clientId: string, clientSecret: string, audience: string, scope: string) {
    const resp = await fetch(`${authProviderBaseUrl}/auth/oauth/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: JSON.stringify({
            client_id: clientId,
            grant_type: "client_credentials",
            audience: audience,
            scope: scope,
        }),
    });

    const tokens = await resp.json();
    return tokens.access_token;
}

async function callHello(accessToken: string) {
    const helloRes = await fetch(`${authProviderBaseUrl}/oauth/hello`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    return helloRes.text();
}

type AssistantEvent = {
    id: number;
    title: string;
    description: string;
    start: number;
    end: number;
};

async function addEvent(accessToken: string, event: Omit<AssistantEvent, "id">) {
    const resp = await fetch(`${calendarServiceBaseUrl}/event`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
    });

    if (!resp.ok) {
        throw new Error(`Failed to add event: ${await resp.text()}`);
    }
    return resp.json();
}

async function deleteEvent(accessToken: string, eventId: number) {
    const resp = await fetch(`${calendarServiceBaseUrl}/event/${eventId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!resp.ok) {
        throw new Error(`Failed to delete event: ${await resp.text()}`);
    }
    return resp.json();
}

async function getEvents(accessToken: string): Promise<AssistantEvent[]> {
    const resp = await fetch(`${calendarServiceBaseUrl}/event`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!resp.ok) {
        throw new Error(`Failed to get events: ${await resp.text()}`);
    }
    return resp.json();
}

type AssistantNote = {
    id: number;
    title: string;
    description: string;
};

async function addNote(accessToken: string, note: Omit<AssistantNote, "id">) {
    const resp = await fetch(`${noteServiceBaseUrl}/note`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(note),
    });
    if (!resp.ok) {
        throw new Error(`Failed to add note: ${await resp.text()}`);
    }
    return resp.json();
}

async function deleteNote(accessToken: string, noteId: number) {
    const resp = await fetch(`${noteServiceBaseUrl}/note/${noteId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!resp.ok) {
        throw new Error(`Failed to delete note: ${await resp.text()}`);
    }
    return resp.json();
}

async function getNotes(accessToken: string): Promise<AssistantNote[]> {
    const resp = await fetch(`${noteServiceBaseUrl}/note`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!resp.ok) {
        throw new Error(`Failed to get notes: ${await resp.text()}`);
    }
    return resp.json();
}

async function updateNote(accessToken: string, noteId: number, note: Partial<Omit<AssistantNote, "id">>) {
    const resp = await fetch(`${noteServiceBaseUrl}/note/${noteId}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(note),
    });
    if (!resp.ok) {
        throw new Error(`Failed to update note: ${await resp.text()}`);
    }
    return resp.json();
}

async function main() {
    const file = await readFile("../clients.json", "utf-8");
    const clients = JSON.parse(file);
    console.log(clients);
    const { clientId, clientSecret } = clients.assistant;

    let accessToken = await getAccessToken(clientId, clientSecret, "calendar-service", "calendar.write calendar.read");
    console.log(accessToken);

    console.log(await getEvents(accessToken));
    console.log(
        await addEvent(accessToken, {
            title: "Test Event",
            description: "Test Description",
            start: 1714838400,
            end: 1714842000,
        })
    );
    const events = await getEvents(accessToken);
    console.log(await deleteEvent(accessToken, events[0].id));
    console.log(await getEvents(accessToken));

    accessToken = await getAccessToken(clientId, clientSecret, "note-service", "note.write note.read");
    console.log(await getNotes(accessToken));
    console.log(await addNote(accessToken, { title: "Test Note", description: "Test Description" }));
    const notes = await getNotes(accessToken);
    console.log(await deleteNote(accessToken, notes[0].id));
    console.log(
        await updateNote(accessToken, notes[1].id, { title: "Updated Note", description: "Updated Description" })
    );
    console.log(await getNotes(accessToken));
}

main();
