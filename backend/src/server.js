import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const TOKEN_COOKIE = 'jp_token';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const signToken = (userId) => jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });

const authMiddleware = (req, _res, next) => {
  const header = req.headers.authorization;
  let token = null;
  if (header && header.startsWith('Bearer ')) {
    token = header.replace('Bearer ', '');
  } else if (req.cookies?.[TOKEN_COOKIE]) {
    token = req.cookies[TOKEN_COOKIE];
  }
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload?.sub) {
        req.userId = Number(payload.sub);
      }
    } catch (err) {
      // ignore invalid token
    }
  }
  next();
};

app.use(authMiddleware);

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

const tripInclude = {
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
  memberships: { include: { user: { select: { id: true, email: true, name: true } } } },
};

const parseTripCities = (trip) => ({
  ...trip,
  days: trip.days.map((day) => ({
    ...day,
    cityIds: day.cityIdsJson ? JSON.parse(day.cityIdsJson) : (day.cityId ? [day.cityId] : []),
  })),
});

async function getUserRoleForTrip(tripId, userId) {
  if (!userId) return null;
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
    },
    select: { ownerId: true, memberships: { where: { userId }, select: { role: true } } },
  });
  if (!trip) return null;
  if (trip.ownerId === userId) return 'owner';
  return trip.memberships[0]?.role || null;
}

async function assertTripEditor(res, tripId, userId) {
  const role = await getUserRoleForTrip(tripId, userId);
  if (!role) {
    res.status(403).json({ error: 'no access to this trip' });
    return false;
  }
  if (role === 'viewer') {
    res.status(403).json({ error: 'view-only access' });
    return false;
  }
  return true;
}

async function assertTripEditorByDayId(res, dayId, userId) {
  const day = await prisma.day.findUnique({ where: { id: dayId }, select: { tripId: true } });
  if (!day) {
    res.status(404).json({ error: 'Day not found' });
    return false;
  }
  return assertTripEditor(res, day.tripId, userId);
}

async function assertTripEditorByActivityId(res, activityId, userId) {
  const act = await prisma.activity.findUnique({ where: { id: activityId }, select: { day: { select: { tripId: true } } } });
  if (!act?.day) {
    res.status(404).json({ error: 'Activity not found' });
    return false;
  }
  return assertTripEditor(res, act.day.tripId, userId);
}

async function assertTripEditorByBookingId(res, bookingId, userId) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { tripId: true } });
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return false;
  }
  return assertTripEditor(res, booking.tripId, userId);
}

async function assertTripEditorByIdeaId(res, ideaId, userId) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId }, select: { tripId: true } });
  if (!idea) {
    res.status(404).json({ error: 'Idea not found' });
    return false;
  }
  return assertTripEditor(res, idea.tripId, userId);
}

async function assertTripEditorByPlaceId(res, placeId, userId) {
  const place = await prisma.place.findUnique({ where: { id: placeId }, select: { tripId: true } });
  if (!place) {
    res.status(404).json({ error: 'Place not found' });
    return false;
  }
  return assertTripEditor(res, place.tripId, userId);
}

async function assertTripEditorByCityId(res, cityId, userId) {
  const city = await prisma.city.findUnique({ where: { id: cityId }, select: { tripId: true } });
  if (!city) {
    res.status(404).json({ error: 'City not found' });
    return false;
  }
  return assertTripEditor(res, city.tripId, userId);
}

async function assertTripEditorByChecklistId(res, checklistId, userId) {
  const item = await prisma.checklistItem.findUnique({ where: { id: checklistId }, select: { tripId: true } });
  if (!item) {
    res.status(404).json({ error: 'Checklist item not found' });
    return false;
  }
  return assertTripEditor(res, item.tripId, userId);
}

async function assertTripEditorByExpenseId(res, expenseId, userId) {
  const exp = await prisma.expense.findUnique({ where: { id: expenseId }, select: { tripId: true } });
  if (!exp) {
    res.status(404).json({ error: 'Expense not found' });
    return false;
  }
  return assertTripEditor(res, exp.tripId, userId);
}

app.post('/auth/register', asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'email already registered' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name: name || null },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  const token = signToken(user.id);
  res
    .cookie(TOKEN_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: false })
    .status(201)
    .json(user);
}));

app.post('/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  const token = signToken(user.id);
  res
    .cookie(TOKEN_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: false })
    .json({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt });
}));

app.post('/auth/logout', asyncHandler(async (_req, res) => {
  res.clearCookie(TOKEN_COOKIE).status(204).end();
}));

app.get('/auth/me', asyncHandler(async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: 'not authenticated' });
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) return res.status(401).json({ error: 'not authenticated' });
  res.json(user);
}));

app.get('/health', asyncHandler(async (_req, res) => {
  const tripCount = await prisma.trip.count();
  res.json({ status: 'ok', trips: tripCount });
}));

app.get('/trips', asyncHandler(async (req, res) => {
  const where = req.userId
    ? {
        OR: [
          { ownerId: req.userId },
          { memberships: { some: { userId: req.userId } } },
        ],
      }
    : undefined;
  const trips = await prisma.trip.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: tripInclude,
  });
  await Promise.all(trips.map((trip) => ensureTripDays(trip)));
  res.json(trips.map(parseTripCities));
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
      ownerId: req.userId || null,
      memberships: req.userId ? { create: { userId: req.userId, role: 'owner' } } : undefined,
    },
    include: tripInclude,
  });

  res.status(201).json(parseTripCities(trip));
}));

app.get('/trips/:id', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const accessFilter = req.userId
    ? {
        id: tripId,
        OR: [
          { ownerId: req.userId },
          { memberships: { some: { userId: req.userId } } },
        ],
      }
    : { id: tripId };
  const trip = await prisma.trip.findFirst({
    where: accessFilter,
    include: tripInclude,
  });

  if (!trip) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  await ensureTripDays(trip);

  const refreshed = await prisma.trip.findFirst({
    where: accessFilter,
    include: tripInclude,
  });

  res.json(refreshed ? parseTripCities(refreshed) : null);
}));

app.get('/trips/:id/memberships', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const accessOk = await assertTripEditor(res, tripId, req.userId);
  if (!accessOk) return;
  const memberships = await prisma.tripMembership.findMany({
    where: { tripId },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { id: 'asc' },
  });
  res.json(memberships);
}));

app.post('/trips/:id/memberships', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const accessOk = await assertTripEditor(res, tripId, req.userId);
  if (!accessOk) return;
  const { email, role } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }
  const roleToUse = role || 'viewer';
  const membership = await prisma.tripMembership.upsert({
    where: { tripId_userId: { tripId, userId: user.id } },
    update: { role: roleToUse },
    create: { tripId, userId: user.id, role: roleToUse },
  });
  res.status(201).json(membership);
}));

app.post('/trips/:id/days', asyncHandler(async (req, res) => {
  const tripId = Number(req.params.id);
  const { date, title, note, cityId, cityIds } = req.body;
  if (!date) {
    return res.status(400).json({ error: 'date is required (ISO string)' });
  }
  const accessOk = await assertTripEditor(res, tripId, req.userId);
  if (!accessOk) return;

  const cityIdsArray = Array.isArray(cityIds) ? cityIds.map((c) => Number(c)).filter((c) => !Number.isNaN(c)) : [];
  const primaryCityId = cityId || cityIdsArray[0] || null;

  const day = await prisma.day.create({
    data: {
      date: new Date(date),
      title: title || null,
      note: note || null,
      tripId,
      cityId: primaryCityId,
      cityIdsJson: cityIdsArray.length ? JSON.stringify(cityIdsArray) : null,
    },
  });

  res.status(201).json({
    ...day,
    cityIds: cityIdsArray,
  });
}));

app.patch('/days/:id', asyncHandler(async (req, res) => {
  const dayId = Number(req.params.id);
  const { title, note, cityId, cityIds } = req.body;
  const accessOk = await assertTripEditorByDayId(res, dayId, req.userId);
  if (!accessOk) return;
  const cityIdsArray = Array.isArray(cityIds) ? cityIds.map((c) => Number(c)).filter((c) => !Number.isNaN(c)) : null;
  const updated = await prisma.day.update({
    where: { id: dayId },
    data: {
      title: title ?? undefined,
      note: note ?? undefined,
      cityId: cityId ?? (cityIdsArray ? cityIdsArray[0] ?? null : undefined),
      cityIdsJson: cityIdsArray ? (cityIdsArray.length ? JSON.stringify(cityIdsArray) : null) : undefined,
    },
  });
  res.json({
    ...updated,
    cityIds: cityIdsArray ?? (updated.cityIdsJson ? JSON.parse(updated.cityIdsJson) : updated.cityId ? [updated.cityId] : []),
  });
}));

app.post('/days/:id/activities', asyncHandler(async (req, res) => {
  const dayId = Number(req.params.id);
  const { title, description, startTime, endTime, location, category, cityId } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
   const accessOk = await assertTripEditorByDayId(res, dayId, req.userId);
   if (!accessOk) return;

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
  const accessOk = await assertTripEditorByActivityId(res, activityId, req.userId);
  if (!accessOk) return;

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
  const accessOk = await assertTripEditorByActivityId(res, activityId, req.userId);
  if (!accessOk) return;
  await prisma.activity.delete({ where: { id: activityId } });
  res.status(204).end();
}));

app.post('/days/:id/activities/reorder', asyncHandler(async (req, res) => {
  const dayId = Number(req.params.id);
  const { order } = req.body;
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'order must be an array of activity IDs' });
  }
  const accessOk = await assertTripEditorByDayId(res, dayId, req.userId);
  if (!accessOk) return;
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
  const accessOk = await assertTripEditor(res, tripId, req.userId);
  if (!accessOk) return;

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
  const accessOk = await assertTripEditor(res, existing.tripId, req.userId);
  if (!accessOk) return;

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
  const accessOk = await assertTripEditor(res, tripId, req.userId);
  if (!accessOk) return;

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
  const accessOk = await assertTripEditor(res, tripId, req.userId);
  if (!accessOk) return;

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
  const accessOk = await assertTripEditorByBookingId(res, bookingId, req.userId);
  if (!accessOk) return;
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
  const accessOk = await assertTripEditor(res, tripId, req.userId);
  if (!accessOk) return;

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
  const accessOk = await assertTripEditorByCityId(res, cityId, req.userId);
  if (!accessOk) return;
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
  const accessOk = await assertTripEditor(res, tripId, req.userId);
  if (!accessOk) return;
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
  const accessOk = await assertTripEditorByCityId(res, cityId, req.userId);
  if (!accessOk) return;
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
  const accessOk = await assertTripEditor(res, tripId, req.userId);
  if (!accessOk) return;

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
  const accessOk = await assertTripEditorByPlaceId(res, placeId, req.userId);
  if (!accessOk) return;
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
    const accessOk = await assertTripEditorByPlaceId(res, placeId, req.userId);
    if (!accessOk) return;
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
  const accessOk = await assertTripEditorByPlaceId(res, placeId, req.userId);
  if (!accessOk) return;

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
  const accessOk = await assertTripEditor(res, tripId, req.userId);
  if (!accessOk) return;

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
  const accessOk = await assertTripEditorByIdeaId(res, ideaId, req.userId);
  if (!accessOk) return;
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
  const accessOk = await assertTripEditorByIdeaId(res, ideaId, req.userId);
  if (!accessOk) return;

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
    const accessOk = await assertTripEditorByIdeaId(res, ideaId, req.userId);
    if (!accessOk) return;
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
  const accessOk = await assertTripEditor(res, tripId, req.userId);
  if (!accessOk) return;

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
