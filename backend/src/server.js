import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function ensureTripDays(trip) {
  if (!trip?.startDate || !trip?.endDate) return;
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  if (Number.isNaN(start) || Number.isNaN(end)) return;
  const existing = await prisma.day.findMany({
    where: { tripId: trip.id },
    select: { id: true, date: true },
  });
  const existingByIso = new Set(existing.map((d) => d.date.toISOString().slice(0, 10)));

  const toCreate = [];
  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    const iso = dt.toISOString().slice(0, 10);
    if (!existingByIso.has(iso)) {
      toCreate.push({ date: new Date(iso), title: null, tripId: trip.id });
    }
  }

  if (toCreate.length > 0) {
    await prisma.day.createMany({ data: toCreate });
  }
}

app.get('/health', asyncHandler(async (_req, res) => {
  const tripCount = await prisma.trip.count();
  res.json({ status: 'ok', trips: tripCount });
}));

app.get('/trips', asyncHandler(async (_req, res) => {
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      cities: { orderBy: { position: 'asc' } },
      days: {
        orderBy: { date: 'asc' },
        include: { activities: { orderBy: [{ position: 'asc' }, { startTime: 'asc' }], include: { city: true } }, city: true },
      },
      checklist: true,
      expenses: true,
      media: true,
      ideas: true,
      bookings: true,
    },
  });
  await Promise.all(trips.map((trip) => ensureTripDays(trip)));
  res.json(trips);
}));

app.post('/trips', asyncHandler(async (req, res) => {
  const { name, startDate, endDate, homeTimeZone } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const trip = await prisma.trip.create({
    data: {
      name,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      homeTimeZone: homeTimeZone || null,
    },
  });

  res.status(201).json(trip);
}));

app.get('/trips/:id', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      cities: { orderBy: { position: 'asc' } },
      days: {
        orderBy: { date: 'asc' },
        include: {
          activities: { orderBy: [{ position: 'asc' }, { startTime: 'asc' }], include: { city: true } },
          city: true,
        },
      },
      checklist: true,
      expenses: true,
      media: true,
      ideas: true,
      bookings: true,
    },
  });

  if (!trip) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  await ensureTripDays(trip);

  const refreshed = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      cities: { orderBy: { position: 'asc' } },
      days: {
        orderBy: { date: 'asc' },
        include: {
          activities: { orderBy: [{ position: 'asc' }, { startTime: 'asc' }], include: { city: true } },
          city: true,
        },
      },
      checklist: true,
      expenses: true,
      media: true,
      ideas: true,
      bookings: true,
    },
  });

  res.json(refreshed);
}));

app.post('/trips/:id/days', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const { date, title, note, cityId } = req.body;
  if (!date) {
    return res.status(400).json({ error: 'date is required (ISO string)' });
  }

  const day = await prisma.day.create({
    data: {
      date: new Date(date),
      title: title || null,
      note: note || null,
      tripId,
      cityId: cityId || null,
    },
  });

  res.status(201).json(day);
}));

app.patch('/days/:id', asyncHandler(async (req, res) => {
  const dayId = Number(req.params.id);
  const { title, note, cityId } = req.body;
  const updated = await prisma.day.update({
    where: { id: dayId },
    data: {
      title: title ?? undefined,
      note: note ?? undefined,
      cityId: cityId ?? undefined,
    },
  });
  res.json(updated);
}));

app.post('/days/:id/activities', asyncHandler(async (req, res) => {
  const dayId = Number(req.params.id);
  const { title, description, startTime, endTime, location, category, cityId } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  let cityIdToUse = cityId || null;
  if (!cityIdToUse) {
    const day = await prisma.day.findUnique({ where: { id: dayId } });
    if (day?.cityId) {
      cityIdToUse = day.cityId;
    }
  }
  if (!cityIdToUse) {
    return res.status(400).json({ error: 'cityId is required (or set on the day)' });
  }

  const activity = await prisma.activity.create({
    data: {
      title,
      description: description || null,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      location: location || null,
      category: category || null,
      dayId,
      cityId: cityIdToUse,
    },
    include: { city: true },
  });

  res.status(201).json(activity);
}));

app.patch('/activities/:id', asyncHandler(async (req, res) => {
  const activityId = Number(req.params.id);
  const existing = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!existing) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  const { title, description, startTime, endTime, location, category, cityId } = req.body;
  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: {
      title: title ?? existing.title,
      description: description ?? existing.description,
      startTime: startTime ? new Date(startTime) : existing.startTime,
      endTime: endTime ? new Date(endTime) : existing.endTime,
      location: location ?? existing.location,
      category: category ?? existing.category,
      cityId: cityId ?? existing.cityId,
    },
    include: { city: true },
  });

  res.json(updated);
}));

app.delete('/activities/:id', asyncHandler(async (req, res) => {
  const activityId = Number(req.params.id);
  await prisma.activity.delete({ where: { id: activityId } });
  res.status(204).end();
}));

app.post('/days/:id/activities/reorder', asyncHandler(async (req, res) => {
  const dayId = Number(req.params.id);
  const { order } = req.body;
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'order must be an array of activity IDs' });
  }
  await prisma.$transaction(
    order.map((id, idx) =>
      prisma.activity.update({
        where: { id: Number(id) },
        data: { position: idx + 1 },
      })
    )
  );
  const activities = await prisma.activity.findMany({
    where: { dayId },
    orderBy: [{ position: 'asc' }, { startTime: 'asc' }],
    include: { city: true },
  });
  res.json(activities);
}));

app.post('/trips/:id/checklist', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const { title, category } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const item = await prisma.checklistItem.create({
    data: { title, category: category || null, tripId },
  });

  res.status(201).json(item);
}));

app.patch('/checklist/:id/toggle', asyncHandler(async (req, res) => {
  const itemId = Number(req.params.id);
  const existing = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!existing) {
    return res.status(404).json({ error: 'Checklist item not found' });
  }

  const updated = await prisma.checklistItem.update({
    where: { id: itemId },
    data: { done: !existing.done },
  });

  res.json(updated);
}));

app.post('/trips/:id/expenses', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const { amount, currency, category, note, incurredAt } = req.body;
  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: 'amount is required' });
  }

  const expense = await prisma.expense.create({
    data: {
      amount: amount.toString(),
      currency: currency || 'JPY',
      category: category || null,
      note: note || null,
      incurredAt: incurredAt ? new Date(incurredAt) : null,
      tripId,
    },
  });

  res.status(201).json(expense);
}));

app.post('/trips/:id/media', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const { url, caption, location, takenAt } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  const media = await prisma.media.create({
    data: {
      url,
      caption: caption || null,
      location: location || null,
      takenAt: takenAt ? new Date(takenAt) : null,
      tripId,
    },
  });

  res.status(201).json(media);
}));

app.get('/trips/:id/bookings', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const bookings = await prisma.booking.findMany({
    where: { tripId },
    orderBy: [{ dateTime: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(bookings);
}));

app.post('/trips/:id/bookings', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const { title, type, dateTime, location, confirmationCode, link, note, dayId } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const booking = await prisma.booking.create({
    data: {
      title,
      type: type || null,
      dateTime: dateTime ? new Date(dateTime) : null,
      location: location || null,
      confirmationCode: confirmationCode || null,
      link: link || null,
      note: note || null,
      tripId,
      dayId: dayId || null,
    },
  });

  res.status(201).json(booking);
}));

app.delete('/bookings/:id', asyncHandler(async (req, res) => {
  const bookingId = Number(req.params.id);
  await prisma.booking.delete({ where: { id: bookingId } });
  res.status(204).end();
}));

// Cities
app.get('/trips/:id/cities', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const cities = await prisma.city.findMany({
    where: { tripId },
    orderBy: { position: 'asc' },
  });
  res.json(cities);
}));

app.post('/trips/:id/cities', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const { name, country, startDate, endDate, notes, timeZone } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const maxPosition = await prisma.city.aggregate({
    where: { tripId },
    _max: { position: true },
  });

  const city = await prisma.city.create({
    data: {
      name,
      country: country || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      notes: notes || null,
      timeZone: timeZone || null,
      position: (maxPosition._max.position || 0) + 1,
      tripId,
    },
  });

  res.status(201).json(city);
}));

app.patch('/cities/:id', asyncHandler(async (req, res) => {
  const cityId = Number(req.params.id);
  const { name, country, startDate, endDate, notes, position, timeZone } = req.body;
  const city = await prisma.city.update({
    where: { id: cityId },
    data: {
      name: name ?? undefined,
      country: country ?? undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      notes: notes ?? undefined,
      timeZone: timeZone ?? undefined,
      position: position ?? undefined,
    },
  });
  res.json(city);
}));

app.post('/trips/:id/cities/reorder', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const { order } = req.body;
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'order must be an array of city IDs' });
  }
  await prisma.$transaction(
    order.map((id, idx) =>
      prisma.city.update({
        where: { id: Number(id) },
        data: { position: idx + 1 },
      })
    )
  );
  const cities = await prisma.city.findMany({ where: { tripId }, orderBy: { position: 'asc' } });
  res.json(cities);
}));

app.delete('/cities/:id', asyncHandler(async (req, res) => {
  const cityId = Number(req.params.id);
  await prisma.city.delete({ where: { id: cityId } });
  res.status(204).end();
}));

// Places
app.get('/trips/:id/places', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const places = await prisma.place.findMany({
    where: { tripId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  res.json(places);
}));

app.post('/trips/:id/places', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const { name, address, lat, lng, tag, link, notes, cityId } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!cityId) {
    return res.status(400).json({ error: 'cityId is required' });
  }

  const place = await prisma.place.create({
    data: {
      name,
      address: address || null,
      lat: lat !== undefined && lat !== null && lat !== '' ? Number(lat) : null,
      lng: lng !== undefined && lng !== null && lng !== '' ? Number(lng) : null,
      tag: tag || null,
      link: link || null,
      notes: notes || null,
      tripId,
      cityId: cityId || null,
    },
  });

  res.status(201).json(place);
}));

app.patch('/places/:id', asyncHandler(async (req, res) => {
  const placeId = Number(req.params.id);
  const { name, address, lat, lng, tag, link, notes, cityId } = req.body;
  const place = await prisma.place.update({
    where: { id: placeId },
    data: {
      name: name ?? undefined,
      address: address ?? undefined,
      lat: lat === undefined ? undefined : (lat === null || lat === '' ? null : Number(lat)),
      lng: lng === undefined ? undefined : (lng === null || lng === '' ? null : Number(lng)),
      tag: tag ?? undefined,
      link: link ?? undefined,
      notes: notes ?? undefined,
      cityId: cityId ?? undefined,
    },
  });
  res.json(place);
}));

app.delete('/places/:id', asyncHandler(async (req, res) => {
  const placeId = Number(req.params.id);
  try {
    await prisma.place.delete({ where: { id: placeId } });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Place not found' });
    }
    throw err;
  }
}));

app.post('/places/:id/promote', asyncHandler(async (req, res) => {
  const placeId = Number(req.params.id);
  const { dayId, startTime, location, category } = req.body;
  if (!dayId) {
    return res.status(400).json({ error: 'dayId is required to promote' });
  }

  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place) {
    return res.status(404).json({ error: 'Place not found' });
  }

  const day = await prisma.day.findUnique({ where: { id: dayId } });
  const cityIdToUse = place.cityId || day?.cityId;
  if (!cityIdToUse) {
    return res.status(400).json({ error: 'cityId is required (set on place or day)' });
  }

  const activity = await prisma.activity.create({
    data: {
      title: place.name,
      description: place.notes || null,
      startTime: startTime ? new Date(startTime) : null,
      location: location || place.address || place.name,
      category: category || place.tag || null,
      dayId,
      cityId: cityIdToUse,
      placeId,
    },
    include: { city: true, place: true },
  });

  res.status(201).json({ activity });
}));

app.get('/trips/:id/ideas', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const ideas = await prisma.idea.findMany({
    where: { tripId },
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(ideas);
}));

app.post('/trips/:id/ideas', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const { title, link, note, category, cityId } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const maxPosition = await prisma.idea.aggregate({
    where: { tripId },
    _max: { position: true },
  });

  const idea = await prisma.idea.create({
    data: {
      title,
      link: link || null,
      note: note || null,
      category: category || null,
      cityId: cityId || null,
      position: (maxPosition._max.position || 0) + 1,
      tripId,
    },
  });

  res.status(201).json(idea);
}));

app.patch('/ideas/:id', asyncHandler(async (req, res) => {
  const ideaId = Number(req.params.id);
  const { title, link, note, status, category, cityId } = req.body;
  const idea = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      title: title ?? undefined,
      link: link ?? undefined,
      note: note ?? undefined,
      category: category ?? undefined,
      cityId: cityId ?? undefined,
      status: status ?? undefined,
    },
  });
  res.json(idea);
}));

app.post('/ideas/:id/promote', asyncHandler(async (req, res) => {
  const ideaId = Number(req.params.id);
  const { dayId, startTime, location, category } = req.body;
  if (!dayId) {
    return res.status(400).json({ error: 'dayId is required to promote' });
  }

  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) {
    return res.status(404).json({ error: 'Idea not found' });
  }

  const activity = await prisma.activity.create({
    data: {
      title: idea.title,
      description: idea.note || null,
      startTime: startTime ? new Date(startTime) : null,
      location: location || null,
      category: category || idea.category || null,
      dayId,
    },
  });

  await prisma.idea.update({
    where: { id: ideaId },
    data: { status: 'promoted' },
  });

  res.status(201).json({ activity });
}));

app.delete('/ideas/:id', asyncHandler(async (req, res) => {
  const ideaId = Number(req.params.id);
  try {
    await prisma.idea.delete({ where: { id: ideaId } });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Idea not found' });
    }
    throw err;
  }
}));

app.post('/trips/:id/ideas/reorder', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const { order } = req.body; // array of idea IDs in desired order
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'order must be an array of idea IDs' });
  }

  await prisma.$transaction(
    order.map((id, idx) =>
      prisma.idea.update({
        where: { id: Number(id) },
        data: { position: idx + 1 },
      })
    )
  );

  const ideas = await prisma.idea.findMany({
    where: { tripId },
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
  });

  res.json(ideas);
}));

// Generic error handler for predictable API responses.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected error', detail: err.message });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
