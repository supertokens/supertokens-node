#!/usr/bin/env ts-node

import React from 'react';
import {render} from 'ink';
import App from './ui/app.js';
import {Command} from 'commander';
import {getAccessToken} from './getAccessToken.js';
import {
	addEvent,
	getEvents,
	deleteEvent,
	AssistantEvent,
	updateEvent,
} from './eventFunctions.js';
import {
	addNote,
	AssistantNote,
	deleteNote,
	getNotes,
	updateNote,
} from './noteFunctions.js';

/* This file is just setting up the CLI commands, and the functions to print the output */
/* You can ignore this part, and focus on the functions imported above */
function printEvent(event: AssistantEvent) {
	console.log();
	console.log(`${event.title} (${event.id})`);
	console.log(`  Start: ${new Date(event.start).toLocaleString()}`);
	console.log(`  End: ${new Date(event.end).toLocaleString()}`);
	console.log(`  Description: ${event.description}`);
	console.log();
}
function printNote(note: AssistantNote) {
	console.log();
	console.log(`${note.title} (${note.id})`);
	console.log(`${note.description}`);
	console.log();
}
export const program = new Command();
program
	.name('assistant-client')
	.description('A client for the calendar and note services')
	.version('1.0.0');
const calendarCommand = new Command('calendar').description(
	'Interact with the calendar service',
);
calendarCommand.addCommand(
	new Command('add')
		.description('Add an event')
		.option('-t, --title <title>', 'The title of the event')
		.option('-s, --start <start>', 'The start time of the event')
		.option('-e, --end <end>', 'The end time of the event')
		.argument('<description...>', 'The description of the event')
		.action(async (description, options) => {
			if (description.length === 0) {
				console.error('Please provide a description for the event');
				return;
			}

			const accessToken = await getAccessToken(
				'calendar-service',
				'calendar.write',
			);

			try {
				const event = await addEvent(accessToken, {
					title: options.title ?? 'Untitled Event',
					start: options.start ? Date.parse(options.start) : Date.now(),
					end: options.end
						? Date.parse(options.end)
						: Date.now() + 1000 * 60 * 60,
					description: description.join(' '),
				});
				console.log('Event added successfully');
				printEvent(event);
			} catch (error) {
				console.error('Failed to add event', error);
			}
		}),
);
calendarCommand.addCommand(
	new Command('list').description('List events').action(async () => {
		const accessToken = await getAccessToken(
			'calendar-service',
			'calendar.read',
		);

		try {
			const events = await getEvents(accessToken);
			console.log('Events:');
			for (const event of events) {
				console.log('--------------------------------');
				printEvent(event);
			}
			console.log('--------------------------------');
		} catch (error) {
			console.error('Failed to list events', error);
		}
	}),
);
calendarCommand.addCommand(
	new Command('delete')
		.description('Delete an event')
		.argument('<id>', 'The ID of the event to delete')
		.action(async id => {
			const accessToken = await getAccessToken(
				'calendar-service',
				'calendar.write',
			);

			try {
				const {deleted} = await deleteEvent(accessToken, parseInt(id));
				if (deleted) {
					console.log('Event deleted successfully');
				} else {
					console.log('Event was already deleted');
				}
			} catch (error) {
				console.error('Failed to delete event', error);
			}
		}),
);
program.addCommand(calendarCommand);
const noteCommand = new Command('note').description(
	'Interact with the note service',
);
noteCommand.addCommand(
	new Command('add')
		.description('Add a note')
		.option('-t, --title <title>', 'The title of the note')
		.argument('<description...>', 'The description of the note')
		.action(async (description, options) => {
			const accessToken = await getAccessToken('note-service', 'note.write');
			try {
				const note = await addNote(accessToken, {
					title: options.title ?? 'Untitled Note',
					description: description.join(' '),
				});
				console.log('Note added successfully');
				printNote(note);
			} catch (error) {
				console.error('Failed to add note', error);
			}
		}),
);
noteCommand.addCommand(
	new Command('delete')
		.description('Delete a note')
		.argument('<id>', 'The ID of the note to delete')
		.action(async id => {
			const accessToken = await getAccessToken('note-service', 'note.write');
			try {
				await deleteNote(accessToken, parseInt(id));
				console.log('Note deleted successfully');
			} catch (error) {
				console.error('Failed to delete note', error);
			}
		}),
);
noteCommand.addCommand(
	new Command('list').description('List notes').action(async () => {
		const accessToken = await getAccessToken('note-service', 'note.read');
		try {
			const notes = await getNotes(accessToken);
			console.log('Notes:');
			for (const note of notes) {
				console.log('--------------------------------');
				printNote(note);
			}
			console.log('--------------------------------');
		} catch (error) {
			console.error('Failed to list notes', error);
		}
	}),
);
noteCommand.addCommand(
	new Command('update')
		.description('Update a note')
		.argument('<id>', 'The ID of the note to update')
		.option('-t, --title <title>', 'The title of the note')
		.argument('<description...>', 'The description of the note')
		.action(async (id, description, options) => {
			const accessToken = await getAccessToken('note-service', 'note.write');
			try {
				const updatedNote = await updateNote(accessToken, parseInt(id), {
					title: options.title,
					description: description.join(' '),
				});
				console.log('Note updated successfully');
				printNote(updatedNote);
			} catch (error) {
				console.error('Failed to update note', error);
			}
		}),
);
program.addCommand(noteCommand);

program.addCommand(
	new Command('start').description('Run the assistant').action(async () => {
		render(
			<App
				getAccessToken={(audience, scope) => getAccessToken(audience, scope)}
				createNewEvent={addEvent}
				getEvents={getEvents}
				deleteEvent={deleteEvent}
				updateEvent={updateEvent}
				getNotes={getNotes}
				createNewNote={addNote}
				deleteNote={deleteNote}
				updateNote={updateNote}
			/>,
		);
	}),
);

program.parse(process.argv);
