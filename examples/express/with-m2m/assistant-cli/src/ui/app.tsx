import React, { useCallback, useState } from "react";
import { ListView } from "./listScreen.js";
import { AssistantEvent } from "../eventFunctions.js";
import { AssistantNote } from "../noteFunctions.js";
import { Box, Text, useInput } from "ink";

export default function App({
	getAccessToken,
	...handlers
}: {
	getAccessToken: (audience: string, scopes: string) => Promise<string>;
	getEvents: (accessToken: string) => Promise<AssistantEvent[]>;
	createNewEvent: (accessToken: string, event: Omit<AssistantEvent, "id">) => Promise<AssistantEvent>;
	deleteEvent: (accessToken: string, id: number) => Promise<{ deleted: boolean }>;
	updateEvent: (accessToken: string, id: number, event: AssistantEvent) => Promise<AssistantEvent>;
	getNotes: (accessToken: string) => Promise<AssistantNote[]>;
	createNewNote: (accessToken: string, note: Omit<AssistantNote, "id">) => Promise<AssistantNote>;
	deleteNote: (accessToken: string, id: number) => Promise<{ deleted: boolean }>;
	updateNote: (accessToken: string, id: number, note: AssistantNote) => Promise<AssistantNote>;
}) {
	const [accessTokenForCalendarService, setAccessTokenForCalendarService] = useState<string>();
	const [accessTokenForNoteService, setAccessTokenForNoteService] = useState<string>();
	const [isLoading, setIsLoading] = useState(false);

	const loadAccessTokens = useCallback(async () => {
		setIsLoading(true);
		const calendarAccessToken = await getAccessToken("calendar-service", "calendar.read calendar.write");
		const noteAccessToken = await getAccessToken("note-service", "note.read note.write");
		setAccessTokenForCalendarService(calendarAccessToken);
		setAccessTokenForNoteService(noteAccessToken);
		setIsLoading(false);
	}, []);

	useInput(
		(input) => {
			if (input === "r") {
				loadAccessTokens().catch(console.error);
			}
		},
		{
			isActive: !isLoading && !accessTokenForCalendarService && !accessTokenForNoteService,
		}
	);

	const getEvents = useCallback(() => {
		if (!accessTokenForCalendarService) return Promise.reject(new Error("No access token"));
		return handlers.getEvents(accessTokenForCalendarService);
	}, [accessTokenForCalendarService]);

	const createNewEvent = useCallback(
		(event: Omit<AssistantEvent, "id">) => {
			if (!accessTokenForCalendarService) return Promise.reject(new Error("No access token"));
			return handlers.createNewEvent(accessTokenForCalendarService, event);
		},
		[accessTokenForCalendarService]
	);

	const deleteEvent = useCallback(
		(id: number) => {
			if (!accessTokenForCalendarService) return Promise.reject(new Error("No access token"));
			return handlers.deleteEvent(accessTokenForCalendarService, id);
		},
		[accessTokenForCalendarService]
	);

	const updateEvent = useCallback(
		(event: AssistantEvent) => {
			if (!accessTokenForCalendarService) return Promise.reject(new Error("No access token"));
			return handlers.updateEvent(accessTokenForCalendarService, event.id, event);
		},
		[accessTokenForCalendarService]
	);

	const getNotes = useCallback(() => {
		if (!accessTokenForNoteService) return Promise.reject(new Error("No access token"));
		return handlers.getNotes(accessTokenForNoteService);
	}, [accessTokenForNoteService]);

	const createNewNote = useCallback(
		(note: Omit<AssistantNote, "id">) => {
			if (!accessTokenForNoteService) return Promise.reject(new Error("No access token"));
			return handlers.createNewNote(accessTokenForNoteService, note);
		},
		[accessTokenForNoteService]
	);

	const deleteNote = useCallback(
		(id: number) => {
			if (!accessTokenForNoteService) return Promise.reject(new Error("No access token"));
			return handlers.deleteNote(accessTokenForNoteService, id);
		},
		[accessTokenForNoteService]
	);

	const updateNote = useCallback(
		(note: AssistantNote) => {
			if (!accessTokenForNoteService) return Promise.reject(new Error("No access token"));
			return handlers.updateNote(accessTokenForNoteService, note.id, note);
		},
		[accessTokenForNoteService]
	);

	return (
		<>
			<Box padding={2}>
				<Text bold underline>
					Assistant CLI
				</Text>
			</Box>
			<Box padding={1} flexDirection="column">
				{accessTokenForNoteService && accessTokenForCalendarService && (
					<>
						<Text wrap="wrap">
							You can navigate using the arrow keys and press enter to select an item.
						</Text>
						<Text wrap="wrap">
							If you select the Add Item or Edit Item options, you will add a new item and immediately
							enter edit mode.
						</Text>
						<Text wrap="wrap">
							You can also delete items by selecting them and pressing the delete key.
						</Text>
						<Text wrap="wrap">
							While editing, you can navigate between fields using the arrow keys and press enter to save
							your changes.
						</Text>
						<Text wrap="wrap">You can leave editing mode by pressing escape.</Text>
						<Text wrap="wrap">
							You can exit the application by pressing escape outside of editing mode.
						</Text>
					</>
				)}
				{/* <Text> Your current access token is for the calendar service: {accessTokenForCalendarService}</Text> */}
				{/* <Text> Your current access token is for the note service: {accessTokenForNoteService}</Text> */}
			</Box>
			{accessTokenForNoteService && accessTokenForCalendarService ? (
				<ListView
					createNewEvent={createNewEvent}
					getEvents={getEvents}
					deleteEvent={deleteEvent}
					updateEvent={updateEvent}
					getNotes={getNotes}
					createNewNote={createNewNote}
					deleteNote={deleteNote}
					updateNote={updateNote}
				/>
			) : (
				<Text>
					{isLoading ? "Loading..." : "Please press 'r' to get your access tokens from the auth service!"}
				</Text>
			)}
		</>
	);
}
