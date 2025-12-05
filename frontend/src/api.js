// Allow overriding the API origin (e.g. when deployed); default to a relative
// /api prefix so we can proxy during local dev without hardcoding localhost.
const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

async function jsonFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function fetchTrips() {
  return jsonFetch('/trips');
}

export function createTrip(payload) {
  return jsonFetch('/trips', { method: 'POST', body: payload });
}

export function createDay(tripId, payload) {
  return jsonFetch(`/trips/${tripId}/days`, { method: 'POST', body: payload });
}

export function updateDay(dayId, payload) {
  return jsonFetch(`/days/${dayId}`, { method: 'PATCH', body: payload });
}

export function createActivity(dayId, payload) {
  return jsonFetch(`/days/${dayId}/activities`, { method: 'POST', body: payload });
}

export function updateActivity(activityId, payload) {
  return jsonFetch(`/activities/${activityId}`, { method: 'PATCH', body: payload });
}

export function deleteActivity(activityId) {
  return jsonFetch(`/activities/${activityId}`, { method: 'DELETE' });
}

export function reorderActivities(dayId, order) {
  return jsonFetch(`/days/${dayId}/activities/reorder`, { method: 'POST', body: { order } });
}

export function toggleChecklistItem(itemId) {
  return jsonFetch(`/checklist/${itemId}/toggle`, { method: 'PATCH' });
}

export function createExpense(tripId, payload) {
  return jsonFetch(`/trips/${tripId}/expenses`, { method: 'POST', body: payload });
}

export function fetchBookings(tripId) {
  return jsonFetch(`/trips/${tripId}/bookings`);
}

export function createBooking(tripId, payload) {
  return jsonFetch(`/trips/${tripId}/bookings`, { method: 'POST', body: payload });
}

export function deleteBooking(bookingId) {
  return jsonFetch(`/bookings/${bookingId}`, { method: 'DELETE' });
}

export function fetchIdeas(tripId) {
  return jsonFetch(`/trips/${tripId}/ideas`);
}

export function createIdea(tripId, payload) {
  return jsonFetch(`/trips/${tripId}/ideas`, { method: 'POST', body: payload });
}

export function updateIdea(ideaId, payload) {
  return jsonFetch(`/ideas/${ideaId}`, { method: 'PATCH', body: payload });
}

export function promoteIdea(ideaId, payload) {
  return jsonFetch(`/ideas/${ideaId}/promote`, { method: 'POST', body: payload });
}

export function deleteIdea(ideaId) {
  return jsonFetch(`/ideas/${ideaId}`, { method: 'DELETE' });
}

export function reorderIdeas(tripId, order) {
  return jsonFetch(`/trips/${tripId}/ideas/reorder`, { method: 'POST', body: { order } });
}

export function fetchCities(tripId) {
  return jsonFetch(`/trips/${tripId}/cities`);
}

export function createCity(tripId, payload) {
  return jsonFetch(`/trips/${tripId}/cities`, { method: 'POST', body: payload });
}

export function updateCity(cityId, payload) {
  return jsonFetch(`/cities/${cityId}`, { method: 'PATCH', body: payload });
}

export function deleteCity(cityId) {
  return jsonFetch(`/cities/${cityId}`, { method: 'DELETE' });
}

export function reorderCities(tripId, order) {
  return jsonFetch(`/trips/${tripId}/cities/reorder`, { method: 'POST', body: { order } });
}

export function fetchPlaces(tripId) {
  return jsonFetch(`/trips/${tripId}/places`);
}

export function createPlace(tripId, payload) {
  return jsonFetch(`/trips/${tripId}/places`, { method: 'POST', body: payload });
}

export function updatePlace(placeId, payload) {
  return jsonFetch(`/places/${placeId}`, { method: 'PATCH', body: payload });
}

export function deletePlace(placeId) {
  return jsonFetch(`/places/${placeId}`, { method: 'DELETE' });
}

export function promotePlace(placeId, payload) {
  return jsonFetch(`/places/${placeId}/promote`, { method: 'POST', body: payload });
}
