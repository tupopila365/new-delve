import * as socialClient from './socialClient'
import type { EventCollaboratorRole } from '@delve/contracts'

export const eventClient = {
  fetchEvent: socialClient.fetchEvent,
  listEvents: socialClient.listEvents,
  createEvent: socialClient.createEvent,
  updateEvent: socialClient.updateEvent,
  fetchEventAttendees: socialClient.fetchEventAttendees,
  setEventAttendance: socialClient.setEventAttendance,
  clearEventAttendance: socialClient.clearEventAttendance,
  addCollaborator: (eventId: string, body: { userId: string; role?: EventCollaboratorRole }) =>
    socialClient.addEventCollaborator(eventId, body),
  removeCollaborator: (eventId: string, userId: string) =>
    socialClient.removeEventCollaborator(eventId, userId),
  deleteEventMedia: socialClient.deleteEventMedia,
  likeEvent: socialClient.likeEvent,
  unlikeEvent: socialClient.unlikeEvent,
}

export {
  fetchEvent,
  listEvents,
  createEvent,
  updateEvent,
  fetchEventAttendees,
  setEventAttendance,
  clearEventAttendance,
  addEventCollaborator,
  removeEventCollaborator,
  deleteEventMedia,
  likeEvent,
  unlikeEvent,
} from './socialClient'
