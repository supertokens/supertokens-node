import React, { useCallback, useEffect, useState } from "react";
import { useInput, Box, Text } from "ink";
import { exit } from "process";
import { AssistantNote } from "../noteFunctions.js";
import { AssistantEvent } from "../eventFunctions.js";
import { NoteCard } from "./note.js";
import { EventCard } from "./event.js";

type ListViewProps = {
	getEvents: () => Promise<AssistantEvent[]>;
	createNewEvent: (event: Omit<AssistantEvent, "id">) => Promise<AssistantEvent>;
	deleteEvent: (id: number) => Promise<{ deleted: boolean }>;
	updateEvent: (event: AssistantEvent) => Promise<AssistantEvent>;
	getNotes: () => Promise<AssistantNote[]>;
	createNewNote: (note: Omit<AssistantNote, "id">) => Promise<AssistantNote>;
	deleteNote: (id: number) => Promise<{ deleted: boolean }>;
	updateNote: (note: AssistantNote) => Promise<AssistantNote>;
};

export function ListView({
	createNewEvent,
	deleteEvent,
	updateEvent,
	createNewNote,
	deleteNote,
	updateNote,
	getEvents,
	getNotes,
}: ListViewProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [notes, setNotes] = useState<AssistantNote[] | null>(null);
	const [events, setEvents] = useState<AssistantEvent[] | null>(null);
	const [selectedType, setSelectedType] = useState<"note" | "event">("note");
	const [selectedIndex, setSelectedIndex] = useState<number>(0);

	const refreshEvents = useCallback(async () => {
		const events = await getEvents();
		setEvents(events);
	}, [getEvents]);

	const refreshNotes = useCallback(async () => {
		const notes = await getNotes();
		setNotes(notes);
	}, [getNotes]);

	useEffect(() => {
		refreshEvents();
		refreshNotes();
	}, [refreshEvents, refreshNotes]);

	useInput(async (input, key) => {
		if (isEditing) {
			return;
		}

		if (input === "q" || key.escape) {
			exit();
		}

		if (input === "r") {
			refreshEvents();
			refreshNotes();
		}
		if (notes === null || events === null) {
			return;
		}

		if (key.leftArrow) {
			setSelectedType("note");
		}

		if (key.rightArrow) {
			setSelectedType("event");
		}

		if (key.upArrow) {
			setSelectedIndex(Math.max(0, selectedIndex - 1));
		}

		if (key.downArrow) {
			setSelectedIndex(Math.min(selectedIndex + 1, selectedType === "note" ? notes.length : events.length));
		}

		if (key.delete) {
			if (selectedType === "note") {
				if (selectedIndex >= notes.length) {
					return;
				}
				await deleteNote(notes[selectedIndex]!.id);
				await refreshNotes();
			}
			if (selectedType === "event") {
				if (selectedIndex >= events.length) {
					return;
				}
				await deleteEvent(events[selectedIndex]!.id);
				await refreshEvents();
			}
		}

		if (key.return) {
			if (selectedType === "note") {
				if (selectedIndex >= notes.length) {
					await createNewNote({
						title: "New Note",
						description: "New Description",
					});
					await refreshNotes();
					setIsEditing(true);
				} else {
					setIsEditing(true);
				}
			}

			if (selectedType === "event") {
				if (selectedIndex >= events.length) {
					await createNewEvent({
						title: "New Event",
						description: "Description",
						start: Date.now() + 1000 * 60 * 60 * 3,
						end: Date.now() + 1000 * 60 * 60 * 4,
					});
					await refreshEvents();
					setIsEditing(true);
				} else {
					setIsEditing(true);
				}
			}
		}
	});

	if (notes === null || events === null) {
		return (
			<Box width={150} justifyContent="space-between" alignItems="flex-start" flexDirection="row">
				<Text>Loading...</Text>
			</Box>
		);
	}

	return (
		<Box width={150} justifyContent="space-between" alignItems="flex-start" flexDirection="row">
			<Box flexDirection="column">
				{notes.map((note, index) => (
					<NoteCard
						note={note}
						key={"nt" + note.id}
						selected={selectedType === "note" && index === selectedIndex}
						isEditing={selectedType === "note" && index === selectedIndex && isEditing}
						onSave={(note) => updateNote(note).then(() => refreshNotes())}
						onDone={() => setIsEditing(false)}
					/>
				))}
				<Box
					width={70}
					flexDirection="column"
					padding={1}
					borderStyle="round"
					borderColor={selectedType === "note" && selectedIndex >= notes.length ? "green" : "white"}>
					<Text>Add Note</Text>
				</Box>
			</Box>
			<Box flexDirection="column">
				{events.map((event, index) => (
					<EventCard
						event={event}
						key={"ev" + event.id}
						selected={selectedType === "event" && index === selectedIndex}
						isEditing={selectedType === "event" && index === selectedIndex && isEditing}
						onSave={(event) => updateEvent(event).then(() => refreshEvents())}
						onDone={() => setIsEditing(false)}
					/>
				))}
				<Box
					width={70}
					flexDirection="column"
					padding={1}
					borderStyle="round"
					borderColor={selectedType === "event" && selectedIndex >= events.length ? "green" : "white"}>
					<Text>Add Event</Text>
				</Box>
			</Box>
		</Box>
	);
}
