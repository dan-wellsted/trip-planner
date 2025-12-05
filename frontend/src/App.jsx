import React, { useEffect, useState } from 'react';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Container,
  Divider,
  Flex,
  IconButton,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Stack,
  Tag,
  Text,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import {
  fetchTrips as fetchTripsApi,
  createTrip,
  createDay,
  createActivity,
  updateActivity,
  deleteActivity,
  toggleChecklistItem,
  createExpense,
  fetchBookings,
  createBooking,
  deleteBooking,
  fetchIdeas,
  createIdea,
  updateIdea,
  promoteIdea,
  deleteIdea,
  reorderIdeas,
  fetchCities,
  createCity,
  updateCity,
  deleteCity,
  reorderCities,
  fetchPlaces,
  createPlace,
  updatePlace,
  deletePlace,
  promotePlace,
} from './api';
import BookingsCard from './components/BookingsCard';
import IdeasBoard from './components/IdeasBoard';
import PlacesBoard from './components/PlacesBoard';

const fallbackTrip = {
  name: 'Japan 2026',
  startDate: '2026-03-16',
  endDate: '2026-04-01',
  homeTimeZone: 'Europe/Madrid',
  days: [
    {
      id: 1,
      date: '2026-03-16',
      title: 'Fly BCN → PEK',
      activities: [
        { id: 1, title: 'Depart Barcelona (CA846)', startTime: '2026-03-16T11:25:00+01:00', location: 'Barcelona T1 (BCN)', category: 'flight' },
        { id: 2, title: 'Arrive Beijing', startTime: '2026-03-17T05:30:00+08:00', location: 'Beijing Capital T3 (PEK)', category: 'flight' },
      ],
    },
    {
      id: 2,
      date: '2026-03-17',
      title: 'PEK → Tokyo arrival',
      activities: [
        { id: 3, title: 'Depart Beijing (CA181)', startTime: '2026-03-17T08:45:00+08:00', location: 'Beijing Capital T3 (PEK)', category: 'flight' },
        { id: 4, title: 'Arrive Tokyo', startTime: '2026-03-17T12:50:00+09:00', location: 'Tokyo Haneda T3 (HND)', category: 'flight' },
      ],
    },
    {
      id: 3,
      date: '2026-03-18',
      title: 'Shinjuku + Omoide Yokocho',
      activities: [
        { id: 5, title: 'Check-in + explore', startTime: '2026-03-18T09:30:00+09:00', location: 'Shinjuku', category: 'travel' },
        { id: 6, title: 'Omoide Yokocho lunch crawl', startTime: '2026-03-18T12:30:00+09:00', location: 'Omoide Yokocho', category: 'food' },
        { id: 7, title: 'Tokyo Metropolitan Gov. tower sunset', startTime: '2026-03-18T16:45:00+09:00', location: 'Nishi-Shinjuku', category: 'view' },
      ],
    },
    {
      id: 4,
      date: '2026-03-19',
      title: 'Ghibli Park + Kichijoji',
      activities: [
        { id: 8, title: 'JR Chuo Line to Ghibli Park', startTime: '2026-03-19T08:00:00+09:00', location: 'Mitaka', category: 'train' },
        { id: 9, title: 'Ghibli Museum entry', startTime: '2026-03-19T10:00:00+09:00', location: 'Mitaka', category: 'culture' },
        { id: 10, title: 'Harmonica Yokocho dinner', startTime: '2026-03-19T18:30:00+09:00', location: 'Kichijoji', category: 'food' },
      ],
    },
    {
      id: 5,
      date: '2026-03-31',
      title: 'Fly back HND → PEK',
      activities: [
        { id: 11, title: 'Depart Tokyo (CA168)', startTime: '2026-03-31T19:20:00+09:00', location: 'Tokyo Haneda T3 (HND)', category: 'flight' },
        { id: 12, title: 'Arrive Beijing', startTime: '2026-03-31T22:20:00+08:00', location: 'Beijing Capital T3 (PEK)', category: 'flight' },
      ],
    },
    {
      id: 6,
      date: '2026-04-01',
      title: 'Fly back PEK → BCN',
      activities: [
        { id: 13, title: 'Depart Beijing (CA845)', startTime: '2026-04-01T02:50:00+08:00', location: 'Beijing Capital T3 (PEK)', category: 'flight' },
        { id: 14, title: 'Arrive Barcelona', startTime: '2026-04-01T08:35:00+02:00', location: 'Barcelona T1 (BCN)', category: 'flight' },
      ],
    },
  ],
  checklist: [
    { id: 1, title: 'JR Pass activated', done: false },
    { id: 2, title: 'eSIM QR saved offline', done: true },
    { id: 3, title: 'Suica loaded with ¥5000', done: false },
  ],
  expenses: [
    { id: 1, note: 'Suica top up', amount: '5000', currency: 'JPY', category: 'transport' },
    { id: 2, note: 'Ghibli tickets', amount: '6000', currency: 'JPY', category: 'tickets' },
  ],
  media: [],
};

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function guessTimeZone(activity) {
  if (activity.city && activity.city.timeZone) {
    return activity.city.timeZone;
  }
  const loc = (activity.location || '').toLowerCase();
  if (loc.includes('tokyo') || loc.includes('shinjuku') || loc.includes('mitaka') || loc.includes('kichijoji') || loc.includes('hnd')) {
    return 'Asia/Tokyo';
  }
  if (loc.includes('beijing') || loc.includes('pek')) {
    return 'Asia/Shanghai';
  }
  if (loc.includes('barcelona') || loc.includes('bcn')) {
    return 'Europe/Madrid';
  }
  return undefined;
}

function getTimeZoneAbbrev(timeZone, date) {
  if (!timeZone) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(date);
    const tzName = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (tzName && !tzName.startsWith('GMT')) return tzName;

    const offsetMinutes = -new Date(date.toLocaleString('en-US', { timeZone })).getTimezoneOffset();
    const map = {
      'Asia/Tokyo': 'JST',
      'Asia/Shanghai': 'CST',
      'Europe/Madrid': offsetMinutes === 120 ? 'CEST' : 'CET',
      'Europe/Paris': offsetMinutes === 120 ? 'CEST' : 'CET',
      'Europe/London': offsetMinutes === 60 ? 'BST' : 'GMT',
      UTC: 'UTC',
    };
    if (map[timeZone]) return map[timeZone];
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMinutes);
    const hours = String(Math.floor(abs / 60)).padStart(2, '0');
    const mins = String(abs % 60).padStart(2, '0');
    return `UTC${sign}${hours}:${mins}`;
  } catch (e) {
    return '';
  }
}

function formatActivityTime(activity) {
  if (!activity) return 'Time tbd';
  if (activity.time) return activity.time;
  if (!activity.startTime) return 'Time tbd';

  const date = new Date(activity.startTime);
  const timeZone = guessTimeZone(activity);
  const formatted = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone || undefined,
  }).format(date);

  const tzAbbrev = getTimeZoneAbbrev(timeZone, date);
  return tzAbbrev ? `${formatted} ${tzAbbrev}` : formatted;
}

function parsePlaceLink(raw) {
  const cleaned = (raw || '').trim();
  if (!cleaned) return {};
  const result = { name: '', link: cleaned, lat: '', lng: '' };
  const trySetCoords = (lat, lng) => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      result.lat = String(lat);
      result.lng = String(lng);
    }
  };

  try {
    const url = new URL(cleaned);
    const q = url.searchParams.get('q') || '';
    const segments = url.pathname.split('/').filter(Boolean);
    const lastPath = segments.pop() || '';
    const placeIdx = segments.findIndex((seg) => seg.toLowerCase() === 'place');
    const placeNameSeg = placeIdx !== -1 ? segments[placeIdx + 1] : null;
    const nameFromQ = decodeURIComponent(q.replace(/\+/g, ' ')).split(',')[0].trim();
    const nameFromPlace = placeNameSeg ? decodeURIComponent(placeNameSeg.replace(/\+/g, ' ')).replace(/[-_]/g, ' ').trim() : '';
    const nameFromPath = decodeURIComponent(lastPath.replace(/[-_]/g, ' ')).trim();
    result.name = nameFromQ || nameFromPlace || nameFromPath || '';

    // Parse coords from Google Maps style URLs (/@lat,lng/ or !3dLAT!4dLNG) or plain q=lat,lng
    const hrefMatch = url.href.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    const pathMatch = url.pathname.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    const coordMatch = hrefMatch || pathMatch;
    if (coordMatch) {
      trySetCoords(Number(coordMatch[1]), Number(coordMatch[2]));
    }
    const qParts = q.split(',').map((p) => Number(p.trim()));
    if (qParts.length === 2 && qParts.every((n) => Number.isFinite(n))) {
      trySetCoords(qParts[0], qParts[1]);
    }
    const bangLat = url.href.match(/!3d(-?\d+\.?\d*)/);
    const bangLng = url.href.match(/!4d(-?\d+\.?\d*)/);
    if (bangLat && bangLng) {
      trySetCoords(Number(bangLat[1]), Number(bangLng[1]));
    }

    return result;
  } catch (err) {
    result.name = cleaned.slice(0, 60);
    return result;
  }
}

function App() {
  const [trip, setTrip] = useState(fallbackTrip);
  const [status, setStatus] = useState('Offline demo data');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDayId, setSelectedDayId] = useState(fallbackTrip.days?.[0]?.id || null);
  const [selectedDayDate, setSelectedDayDate] = useState(fallbackTrip.days?.[0]?.date || '');
  const [tripForm, setTripForm] = useState({ name: '', startDate: '', endDate: '' });
  const [dayForm, setDayForm] = useState({ date: '', title: '' });
  const [activityForm, setActivityForm] = useState({ title: '', startTime: '', location: '', category: '', cityId: '' });
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [expenseForm, setExpenseForm] = useState({ amount: '', currency: 'JPY', note: '', category: '' });
  const [bookings, setBookings] = useState([]);
  const [bookingForm, setBookingForm] = useState({
    title: '',
    type: '',
    dateTime: '',
    location: '',
    confirmationCode: '',
    link: '',
    note: '',
    dayId: '',
    cityId: '',
  });
  const tripModal = useDisclosure();
  const dayModal = useDisclosure();
  const activityModal = useDisclosure();
  const expenseModal = useDisclosure();
  const bookingModal = useDisclosure();
  const ideaModal = useDisclosure();
  const promoteIdeaModal = useDisclosure();
  const [ideas, setIdeas] = useState([]);
  const [ideaForm, setIdeaForm] = useState({ title: '', link: '', note: '', category: '' });
  const [ideaPromote, setIdeaPromote] = useState({ ideaId: null, dayId: '', startTime: '', location: '', category: '' });
  const [editingIdeaId, setEditingIdeaId] = useState(null);
  const [cities, setCities] = useState([]);
  const [cityFilter, setCityFilter] = useState(null);
  const cityModal = useDisclosure();
  const [cityForm, setCityForm] = useState({ name: '', country: '', startDate: '', endDate: '', notes: '' });
  const [editingCityId, setEditingCityId] = useState(null);
  const [places, setPlaces] = useState([]);
  const [placeForm, setPlaceForm] = useState({
    name: '',
    address: '',
    lat: '',
    lng: '',
    tag: '',
    link: '',
    notes: '',
    cityId: '',
  });
  const [editingPlaceId, setEditingPlaceId] = useState(null);
  const placeModal = useDisclosure();
  const promotePlaceModal = useDisclosure();
  const [placePromote, setPlacePromote] = useState({ placeId: null, dayId: '', startTime: '', location: '', category: '' });
  const [placeFilter, setPlaceFilter] = useState({ cityId: null, tag: null });
  const [placeSearch, setPlaceSearch] = useState('');
  const [placeSort, setPlaceSort] = useState('newest');
  const [placeGroupBy, setPlaceGroupBy] = useState('none');
  const [placeView, setPlaceView] = useState('list');
  const [placeFavorites, setPlaceFavorites] = useState([]);
  const [placeFavoritesOnly, setPlaceFavoritesOnly] = useState(false);
  const [undoPlace, setUndoPlace] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);
  const toast = useToast();

  const loadTrips = async () => {
    const safeSetError = (msg) => setError((prev) => prev || msg);
    const safeFetch = async (label, fn) => {
      try {
        return await fn();
      } catch (err) {
        console.warn(`Failed to load ${label}`, err);
        safeSetError(`Some data failed to load (${label}).`);
        return null;
      }
    };

    try {
      setLoading(true);
      setError(null);
      const trips = await fetchTripsApi();
      if (Array.isArray(trips) && trips.length > 0) {
        const firstTrip = trips[0];
        setTrip(firstTrip);
        setCities(firstTrip.cities || []);
        setSelectedDayId(firstTrip.days?.[0]?.id || null);
        setSelectedDayDate(firstTrip.days?.[0]?.date || firstTrip.startDate || '');
        setStatus('Live data from API');
        const [fetchedBookings, fetchedIdeas, fetchedCities, fetchedPlaces] = await Promise.all([
          safeFetch('bookings', () => fetchBookings(firstTrip.id)),
          safeFetch('ideas', () => fetchIdeas(firstTrip.id)),
          safeFetch('cities', () => fetchCities(firstTrip.id)),
          safeFetch('places', () => fetchPlaces(firstTrip.id)),
        ]);
        if (fetchedBookings) setBookings(fetchedBookings);
        if (fetchedIdeas) setIdeas(fetchedIdeas);
        if (fetchedCities) setCities(fetchedCities);
        if (fetchedPlaces) setPlaces(fetchedPlaces);
      } else {
        setStatus('API live but no trips yet');
        setTrip(null);
        setCities([]);
        setBookings([]);
        setIdeas([]);
        setPlaces([]);
        setSelectedDayId(null);
        setSelectedDayDate('');
      }
    } catch (err) {
      console.warn('Falling back to demo data', err);
      setStatus('Offline demo data');
      setError('API unavailable, showing demo data.');
      setSelectedDayId(fallbackTrip.days?.[0]?.id || null);
      setSelectedDayDate(fallbackTrip.days?.[0]?.date || fallbackTrip.startDate || '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('placeFavorites');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPlaceFavorites(parsed.filter((id) => typeof id === 'number'));
        }
      }
    } catch (err) {
      console.warn('Failed to load favorites', err);
    }
  }, []);

  const persistFavorites = (ids) => {
    setPlaceFavorites(ids);
    try {
      localStorage.setItem('placeFavorites', JSON.stringify(ids));
    } catch (err) {
      console.warn('Failed to persist favorites', err);
    }
  };

  const sortedDays = (trip?.days || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));

  const tripStart =
    trip?.startDate && !Number.isNaN(new Date(trip.startDate))
      ? new Date(trip.startDate)
      : sortedDays[0]
        ? new Date(sortedDays[0].date)
        : new Date();
  const tripEnd =
    trip?.endDate && !Number.isNaN(new Date(trip.endDate))
      ? new Date(trip.endDate)
      : sortedDays[sortedDays.length - 1]
        ? new Date(sortedDays[sortedDays.length - 1].date)
        : tripStart;
  const calendarDayCount = Math.max(1, differenceInCalendarDays(tripEnd, tripStart) + 1);
  const daysGrid = Array.from({ length: calendarDayCount }).map((_, idx) => addDays(tripStart, idx));

  const dayOptions = (() => {
    const options = [];
    const existingByDate = new Map(sortedDays.map((d) => [d.date.slice(0, 10), d]));
    for (let i = 0; i < calendarDayCount; i += 1) {
      const date = addDays(tripStart, i);
      const iso = format(date, 'yyyy-MM-dd');
      const existing = existingByDate.get(iso);
      options.push({
        label: `${format(date, 'EEE dd MMM')}${existing?.title ? ` — ${existing.title}` : ''}`,
        value: existing ? String(existing.id) : `date:${iso}`,
        date: iso,
        cityId: existing?.cityId || null,
      });
    }
    return options;
  })();
  const cityColors = ['brand.300', 'indigo.500', 'green.400', 'orange.400', 'pink.400', 'cyan.400'];
  const cityColorMap = new Map(cities.map((c, idx) => [c.id, cityColors[idx % cityColors.length]]));
  const visibleDays = cityFilter ? sortedDays.filter((d) => d.cityId === cityFilter) : sortedDays;

  useEffect(() => {
    loadTrips();
  }, []);

  const handleCreateTrip = async () => {
    if (!tripForm.name) {
      toast({ status: 'warning', title: 'Trip name required' });
      return;
    }
    try {
      await createTrip({
        name: tripForm.name,
        startDate: tripForm.startDate || null,
        endDate: tripForm.endDate || null,
      });
      await loadTrips();
      tripModal.onClose();
      setTripForm({ name: '', startDate: '', endDate: '' });
      toast({ status: 'success', title: 'Trip created' });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to create trip', description: err.message });
    }
  };

  const handleCreateBooking = async () => {
    if (!trip?.id) {
      toast({ status: 'warning', title: 'Create a trip first' });
      return;
    }
    if (!bookingForm.title) {
      toast({ status: 'warning', title: 'Booking title required' });
      return;
    }
    try {
      let dayIdToUse = bookingForm.dayId;
      if (dayIdToUse && String(dayIdToUse).startsWith('date:')) {
        const iso = String(dayIdToUse).replace('date:', '');
        const newDay = await createDay(trip.id, { date: iso, title: null, cityId: bookingForm.cityId ? Number(bookingForm.cityId) : cityFilter || null });
        dayIdToUse = newDay.id;
      }
      await createBooking(trip.id, {
        title: bookingForm.title,
        type: bookingForm.type || null,
        dateTime: bookingForm.dateTime || null,
        location: bookingForm.location || null,
        confirmationCode: bookingForm.confirmationCode || null,
        link: bookingForm.link || null,
        note: bookingForm.note || null,
        dayId: dayIdToUse ? Number(dayIdToUse) : null,
        cityId: bookingForm.cityId ? Number(bookingForm.cityId) : null,
      });
      await loadTrips();
      const fetchedBookings = await fetchBookings(trip.id);
      setBookings(fetchedBookings);
      setBookingForm({
        title: '',
        type: '',
        dateTime: '',
        location: '',
        confirmationCode: '',
        link: '',
        note: '',
        dayId: '',
        cityId: '',
      });
      bookingModal.onClose();
      toast({ status: 'success', title: 'Booking added' });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to add booking', description: err.message });
    }
  };

  const handleDeleteBooking = async (id) => {
    try {
      await deleteBooking(id);
      await loadTrips();
      const fetchedBookings = await fetchBookings(trip.id);
      setBookings(fetchedBookings);
      toast({ status: 'success', title: 'Booking deleted' });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to delete booking', description: err.message });
    }
  };

  const handleCreateOrUpdateIdea = async () => {
    if (!trip?.id) {
      toast({ status: 'warning', title: 'Create a trip first' });
      return;
    }
    if (!ideaForm.title) {
      toast({ status: 'warning', title: 'Idea title required' });
      return;
    }
    try {
      if (editingIdeaId) {
        await updateIdea(editingIdeaId, {
          title: ideaForm.title,
          link: ideaForm.link || null,
          note: ideaForm.note || null,
          category: ideaForm.category || null,
          cityId: ideaForm.cityId ? Number(ideaForm.cityId) : null,
        });
      } else {
        await createIdea(trip.id, {
          title: ideaForm.title,
          link: ideaForm.link || null,
          note: ideaForm.note || null,
          category: ideaForm.category || null,
          cityId: ideaForm.cityId ? Number(ideaForm.cityId) : cityFilter || null,
        });
      }
      const fetchedIdeas = await fetchIdeas(trip.id);
      setIdeas(fetchedIdeas);
      setIdeaForm({ title: '', link: '', note: '', category: '', cityId: '' });
      setEditingIdeaId(null);
      ideaModal.onClose();
      toast({ status: 'success', title: editingIdeaId ? 'Idea updated' : 'Idea added' });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to save idea', description: err.message });
    }
  };

  const handleDeleteIdea = async (id) => {
    try {
      await deleteIdea(id);
      const fetchedIdeas = await fetchIdeas(trip.id);
      setIdeas(fetchedIdeas);
      toast({ status: 'success', title: 'Idea deleted' });
    } catch (err) {
      const message = err?.message?.includes('404') ? 'Idea already removed' : err.message;
      toast({ status: 'error', title: 'Failed to delete idea', description: message });
    }
  };

  const handleCreateOrUpdateCity = async () => {
    if (!trip?.id) {
      toast({ status: 'warning', title: 'Create a trip first' });
      return;
    }
    if (!cityForm.name) {
      toast({ status: 'warning', title: 'City name required' });
      return;
    }
    try {
      if (editingCityId) {
        await updateCity(editingCityId, {
          name: cityForm.name,
          country: cityForm.country || null,
          startDate: cityForm.startDate || null,
          endDate: cityForm.endDate || null,
          notes: cityForm.notes || null,
        });
      } else {
        await createCity(trip.id, {
          name: cityForm.name,
          country: cityForm.country || null,
          startDate: cityForm.startDate || null,
          endDate: cityForm.endDate || null,
          notes: cityForm.notes || null,
        });
      }
      const fetched = await fetchCities(trip.id);
      setCities(fetched);
      if (!cityFilter && fetched.length > 0) {
        setCityFilter(fetched[0].id);
      }
      setCityForm({ name: '', country: '', startDate: '', endDate: '', notes: '' });
      setEditingCityId(null);
      cityModal.onClose();
      toast({ status: 'success', title: editingCityId ? 'City updated' : 'City added' });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to save city', description: err.message });
    }
  };

  const handleDeleteCity = async (cityId) => {
    try {
      await deleteCity(cityId);
      const fetched = await fetchCities(trip.id);
      setCities(fetched);
      if (cityFilter === cityId) {
        setCityFilter(fetched[0]?.id || null);
      }
      toast({ status: 'success', title: 'City deleted' });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to delete city', description: err.message });
    }
  };

  const handleReorderCities = async (movingId, overId) => {
    const current = [...cities];
    const oldIndex = current.findIndex((c) => c.id === movingId);
    const newIndex = current.findIndex((c) => c.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...current];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setCities(reordered);
    try {
      await reorderCities(trip.id, reordered.map((c) => c.id));
    } catch (err) {
      toast({ status: 'error', title: 'Failed to reorder cities', description: err.message });
    }
  };

  const handleDeletePlace = async (placeId) => {
    if (!trip?.id) {
      toast({ status: 'warning', title: 'Create a trip first' });
      return;
    }
    const toRestore = places.find((p) => p.id === placeId) || null;
    setPlaces((prev) => prev.filter((p) => p.id !== placeId));
    if (undoTimer) clearTimeout(undoTimer);
    setUndoPlace(toRestore);
    const timer = setTimeout(() => setUndoPlace(null), 6000);
    setUndoTimer(timer);
    try {
      await deletePlace(placeId);
      toast({ status: 'success', title: 'Place deleted' });
    } catch (err) {
      setPlaces((prev) => (toRestore ? [toRestore, ...prev] : prev));
      toast({ status: 'error', title: 'Failed to delete place', description: err.message });
    }
  };

  const handleSavePlaceFromLink = (linkValue) => {
    if (!trip?.id) {
      toast({ status: 'warning', title: 'Create a trip first' });
      return;
    }
    const parsed = parsePlaceLink(linkValue);
    setEditingPlaceId(null);
    setPlaceForm({
      name: parsed.name || '',
      address: '',
      lat: parsed.lat || '',
      lng: parsed.lng || '',
      tag: '',
      link: parsed.link || '',
      notes: '',
      cityId: placeFilter.cityId || '',
    });
    placeModal.onOpen();
  };

  const handleSaveIdeaAsPlace = (idea) => {
    if (!trip?.id) {
      toast({ status: 'warning', title: 'Create a trip first' });
      return;
    }
    setEditingPlaceId(null);
    setPlaceForm({
      name: idea.title || '',
      address: '',
      lat: '',
      lng: '',
      tag: idea.category || '',
      link: idea.link || '',
      notes: idea.note || '',
      cityId: idea.cityId || cityFilter || '',
    });
    placeModal.onOpen();
  };

  const handlePromotePlace = async () => {
    if (!placePromote.placeId || !placePromote.dayId) {
      toast({ status: 'warning', title: 'Pick a day to promote to' });
      return;
    }
    try {
      let dayToUse = placePromote.dayId;
      if (String(dayToUse).startsWith('date:')) {
        const iso = String(dayToUse).replace('date:', '');
        const newDay = await createDay(trip.id, { date: iso, title: null, cityId: placePromote.cityId || null });
        dayToUse = newDay.id;
      }
      await promotePlace(placePromote.placeId, {
        dayId: Number(dayToUse),
        startTime: placePromote.startTime || null,
        location: placePromote.location || null,
        category: placePromote.category || null,
      });
      await loadTrips();
      setPlacePromote({ placeId: null, dayId: '', startTime: '', location: '', category: '' });
      promotePlaceModal.onClose();
      toast({ status: 'success', title: 'Promoted to activity' });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to promote place', description: err.message });
    }
  };

  const handleQuickPromotePlace = async (place, dayId) => {
    if (!place || !dayId) {
      toast({ status: 'warning', title: 'Pick a day to promote to' });
      return;
    }
    try {
      let dayToUse = dayId;
      if (String(dayId).startsWith('date:')) {
        const iso = String(dayId).replace('date:', '');
        const newDay = await createDay(trip.id, { date: iso, title: null, cityId: place.cityId || null });
        dayToUse = newDay.id;
      }
      await promotePlace(place.id, {
        dayId: Number(dayToUse),
        startTime: null,
        location: place.address || place.name,
        category: place.tag || null,
      });
      await loadTrips();
      toast({ status: 'success', title: 'Promoted to activity' });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to promote place', description: err.message });
    }
  };

  const togglePlaceFavorite = (placeId) => {
    if (!placeId) return;
    setPlaceFavorites((prev) => {
      const exists = prev.includes(placeId);
      const next = exists ? prev.filter((id) => id !== placeId) : [...prev, placeId];
      persistFavorites(next);
      return next;
    });
  };

  const handleUndoDeletePlace = async () => {
    if (!undoPlace || !trip?.id) return;
    const payload = {
      name: undoPlace.name,
      address: undoPlace.address || null,
      lat: undoPlace.lat || null,
      lng: undoPlace.lng || null,
      tag: undoPlace.tag || null,
      link: undoPlace.link || null,
      notes: undoPlace.notes || null,
      cityId: undoPlace.cityId || null,
    };
    try {
      const recreated = await createPlace(trip.id, payload);
      setPlaces((prev) => [recreated, ...prev]);
      setUndoPlace(null);
      if (undoTimer) clearTimeout(undoTimer);
      toast({ status: 'success', title: 'Undo delete', description: `${recreated.name} restored` });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to undo delete', description: err.message });
    }
  };

  const handlePromoteIdea = async () => {
    if (!ideaPromote.ideaId || !ideaPromote.dayId) {
      toast({ status: 'warning', title: 'Pick a day to promote to' });
      return;
    }
    try {
      let dayToUse = ideaPromote.dayId;
      if (String(dayToUse).startsWith('date:')) {
        const iso = String(dayToUse).replace('date:', '');
        const newDay = await createDay(trip.id, { date: iso, title: null, cityId: cityFilter || null });
        dayToUse = newDay.id;
      }
      await promoteIdea(ideaPromote.ideaId, {
        dayId: Number(dayToUse),
        startTime: ideaPromote.startTime || null,
        location: ideaPromote.location || null,
        category: ideaPromote.category || null,
      });
      await loadTrips();
      const fetchedIdeas = await fetchIdeas(trip.id);
      setIdeas(fetchedIdeas);
      setIdeaPromote({ ideaId: null, dayId: '', startTime: '', location: '', category: '' });
      promoteIdeaModal.onClose();
      toast({ status: 'success', title: 'Promoted to activity' });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to promote idea', description: err.message });
    }
  };

  const handleCreateDay = async () => {
    if (!trip?.id) {
      toast({ status: 'warning', title: 'Create a trip first' });
      return;
    }
    if (!dayForm.date) {
      toast({ status: 'warning', title: 'Day date required' });
      return;
    }
    try {
      await createDay(trip.id, { date: dayForm.date, title: dayForm.title || null, cityId: cityFilter || null });
      await loadTrips();
      setDayForm({ date: '', title: '' });
      dayModal.onClose();
      toast({ status: 'success', title: 'Day added' });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to add day', description: err.message });
    }
  };

  const handleCreateActivity = async () => {
    if (!selectedDayId && !selectedDayDate) {
      toast({ status: 'warning', title: 'Select a day first' });
      return;
    }
    if (!activityForm.title) {
      toast({ status: 'warning', title: 'Activity title required' });
      return;
    }
    try {
      let dayIdToUse = selectedDayId;
      if (!dayIdToUse && selectedDayDate) {
        const day = await createDay(trip.id, { date: selectedDayDate, title: null });
        dayIdToUse = day.id;
        setSelectedDayId(day.id);
      }

      await createActivity(dayIdToUse, {
        title: activityForm.title,
        startTime: activityForm.startTime || null,
        location: activityForm.location || null,
        category: activityForm.category || null,
        cityId: activityForm.cityId ? Number(activityForm.cityId) : null,
      });
      await loadTrips();
      setActivityForm({ title: '', startTime: '', location: '', category: '', cityId: '' });
      activityModal.onClose();
      toast({ status: 'success', title: 'Activity added' });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to add activity', description: err.message });
    }
  };

  const handleUpdateActivity = async () => {
    if (!editingActivityId) return;
    try {
      await updateActivity(editingActivityId, {
        title: activityForm.title || undefined,
        startTime: activityForm.startTime || undefined,
        location: activityForm.location || undefined,
        category: activityForm.category || undefined,
        cityId: activityForm.cityId ? Number(activityForm.cityId) : undefined,
      });
      await loadTrips();
      setActivityForm({ title: '', startTime: '', location: '', category: '', cityId: '' });
      setEditingActivityId(null);
      activityModal.onClose();
      toast({ status: 'success', title: 'Activity updated' });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to update activity', description: err.message });
    }
  };

  const handleDeleteActivity = async (activityId) => {
    try {
      await deleteActivity(activityId);
      await loadTrips();
      toast({ status: 'success', title: 'Activity deleted' });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to delete activity', description: err.message });
    }
  };

  const handleToggleChecklist = async (itemId) => {
    try {
      await toggleChecklistItem(itemId);
      await loadTrips();
    } catch (err) {
      toast({ status: 'error', title: 'Failed to update checklist', description: err.message });
    }
  };

  const handleCreateExpense = async () => {
    if (!trip?.id) {
      toast({ status: 'warning', title: 'Create a trip first' });
      return;
    }
    if (!expenseForm.amount) {
      toast({ status: 'warning', title: 'Amount required' });
      return;
    }
    try {
      await createExpense(trip.id, {
        amount: expenseForm.amount,
        currency: expenseForm.currency || 'JPY',
        note: expenseForm.note || null,
        category: expenseForm.category || null,
      });
      await loadTrips();
      setExpenseForm({ amount: '', currency: 'JPY', note: '', category: '' });
      expenseModal.onClose();
      toast({ status: 'success', title: 'Expense added' });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to add expense', description: err.message });
    }
  };

  return (
    <Container maxW="6xl" py={{ base: 8, md: 12 }}>
      <Stack spacing={6}>
        <Stack spacing={3}>
          <HStack spacing={3}>
            <Badge colorScheme="brand" px={3} py={1} borderRadius="full">
              Japan Companion
            </Badge>
            <Tag colorScheme={status.includes('Live') ? 'green' : 'purple'} variant="subtle">
              {status}
            </Tag>
          </HStack>
          <Heading size="2xl" letterSpacing="-0.5px">
            {trip?.name || 'Your adventure'}
          </Heading>
          <Text color="whiteAlpha.800" maxW="3xl">
            Keep itinerary, packing, spend, and photo drops in one place. Built for quick train glances and late-night ramen runs.
          </Text>
          {error && (
            <Text color="red.300" fontSize="sm">
              {error}
            </Text>
          )}
          {loading && (
            <Text color="whiteAlpha.700" fontSize="sm">
              Loading live data…
            </Text>
          )}
          <HStack spacing={2} wrap="wrap">
            <Button
              size="sm"
              variant={cityFilter === null ? 'solid' : 'ghost'}
              bg={cityFilter === null ? 'whiteAlpha.300' : 'whiteAlpha.200'}
              color={cityFilter === null ? '#0c0c0c' : 'white'}
              _hover={{ bg: 'whiteAlpha.300' }}
              onClick={() => setCityFilter(null)}
            >
              All cities
            </Button>
            {(cities || []).map((city) => (
              <Button
                key={city.id}
                size="sm"
                variant={cityFilter === city.id ? 'solid' : 'ghost'}
                bg={cityFilter === city.id ? cityColorMap.get(city.id) || 'indigo.600' : 'whiteAlpha.200'}
                color={cityFilter === city.id ? '#0c0c0c' : 'white'}
                _hover={{ bg: 'whiteAlpha.300' }}
                onClick={() => setCityFilter(cityFilter === city.id ? null : city.id)}
              >
                {city.name} {city.startDate ? `· ${format(new Date(city.startDate), 'MMM d')}` : ''}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => cityModal.onOpen()}>
              Manage cities
            </Button>
          </HStack>
          <HStack spacing={3} flexWrap="wrap">
            <Button size="md" onClick={tripModal.onOpen}>
              + New trip
            </Button>
            <Button size="md" variant="ghost" onClick={dayModal.onOpen}>
              + Add day
            </Button>
            <Button size="md" variant="ghost" onClick={activityModal.onOpen}>
              + Add activity
            </Button>
            <Button size="md" variant="ghost" onClick={expenseModal.onOpen}>
              + Add expense
            </Button>
          </HStack>
        </Stack>

        <Tabs variant="unstyled">
          <TabList gap={2} mb={4}>
            <Tab
              px={4}
              py={2}
              borderRadius="md"
              bg="whiteAlpha.100"
              color="whiteAlpha.800"
              _hover={{ bg: 'whiteAlpha.200' }}
              _selected={{ bg: 'indigo.600', color: 'white' }}
            >
              Dashboard
            </Tab>
            <Tab
              px={4}
              py={2}
              borderRadius="md"
              bg="whiteAlpha.100"
              color="whiteAlpha.800"
              _hover={{ bg: 'whiteAlpha.200' }}
              _selected={{ bg: 'indigo.600', color: 'white' }}
            >
              Calendar
            </Tab>
            <Tab
              px={4}
              py={2}
              borderRadius="md"
              bg="whiteAlpha.100"
              color="whiteAlpha.800"
              _hover={{ bg: 'whiteAlpha.200' }}
              _selected={{ bg: 'indigo.600', color: 'white' }}
            >
              Places
            </Tab>
            <Tab
              px={4}
              py={2}
              borderRadius="md"
              bg="whiteAlpha.100"
              color="whiteAlpha.800"
              _hover={{ bg: 'whiteAlpha.200' }}
              _selected={{ bg: 'indigo.600', color: 'white' }}
            >
              Ideas
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0} bg="transparent" color="whiteAlpha.900">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Card bg="#0f1828" color="whiteAlpha.900" border="1px solid rgba(255,255,255,0.12)">
                  <CardHeader pb={2}>
                    <Heading size="md" color="white">Itinerary</Heading>
                    <Text color="whiteAlpha.700" fontSize="sm">
                      Day plan with quick hits.
                    </Text>
                  </CardHeader>
                  <CardBody>
                    <Stack spacing={4}>
                    {visibleDays.map((day) => {
                      const activityCities = Array.from(
                        new Set(
                          (day.activities || [])
                            .map((a) => a.city?.id)
                            .filter(Boolean)
                        )
                      ).map((id) => cities.find((c) => c.id === id)).filter(Boolean);
                      const dayCities = day.city ? [day.city] : [];
                      const allCities = Array.from(new Map([...dayCities, ...activityCities].map((c) => [c.id, c])).values());
                      return (
                        <Box
                          key={day.id}
                          p={4}
                          borderRadius="14px"
                          bg="#0f1828"
                          border="1px solid rgba(255,255,255,0.12)"
                          color="whiteAlpha.900"
                        >
                          <Flex justify="space-between" align="center" mb={3}>
                            <Tag colorScheme="indigo" variant="solid">
                              {formatDate(day.date)}
                            </Tag>
                            <HStack>
                              {allCities.map((c) => (
                                <Tag key={c.id} color={cityColorMap.get(c.id) ? '#0c0c0c' : undefined} bg={cityColorMap.get(c.id)}>
                                  {c.name}
                                </Tag>
                              ))}
                              <Text color="whiteAlpha.700" fontSize="sm">
                                {day.title}
                              </Text>
                            </HStack>
                          </Flex>
                          <Stack spacing={3}>
                            {(day.activities || []).map((act) => (
                              <Flex key={act.id} align="center" justify="space-between" gap={3}>
                                <Box>
                                  <Text fontWeight="bold" fontSize="lg" color="white">
                                    {act.title}
                                  </Text>
                                  <Text color="whiteAlpha.700" fontSize="sm">
                                    {formatActivityTime(act)} · {act.location || 'TBD'} · {act.category || 'activity'}
                                  </Text>
                                </Box>
                                <HStack>
                                  {act.city && (
                                    <Tag size="sm" bg={cityColorMap.get(act.city.id)} color={cityColorMap.get(act.city.id) ? '#0c0c0c' : undefined}>
                                      {act.city.name}
                                    </Tag>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedDayId(day.id);
                                      setEditingActivityId(act.id);
                                      setActivityForm({
                                        title: act.title || '',
                                        startTime: act.startTime ? new Date(act.startTime).toISOString().slice(0, 16) : '',
                                        location: act.location || '',
                                        category: act.category || '',
                                        cityId: act.city?.id || day.cityId || '',
                                      });
                                      activityModal.onOpen();
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <IconButton
                                    size="sm"
                                    aria-label="Delete"
                                    onClick={() => handleDeleteActivity(act.id)}
                                    icon={
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M5 7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M10 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M6 7l1 12h10l1-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                      </svg>
                                    }
                                  />
                                </HStack>
                              </Flex>
                            ))}
                          </Stack>
                        </Box>
                      );
                    })}
                    </Stack>
                  </CardBody>
                </Card>

                <Stack spacing={4}>
                  <Card bg="#0f1828" color="whiteAlpha.900" border="1px solid rgba(255,255,255,0.12)">
                    <CardHeader pb={2}>
                      <Heading size="md" color="white">Checklist</Heading>
                      <Text color="whiteAlpha.700" fontSize="sm">
                        Keep the pre-trip and daily tasks handy.
                      </Text>
                    </CardHeader>
                    <CardBody>
                      <Stack spacing={3}>
                        {(trip?.checklist || []).map((item) => (
                          <Flex
                            key={item.id}
                            align="center"
                            justify="space-between"
                            p={3}
                            borderRadius="12px"
                            bg="whiteAlpha.100"
                            border="1px solid rgba(255,255,255,0.08)"
                          >
                            <Checkbox isChecked={item.done} colorScheme="brand" onChange={() => handleToggleChecklist(item.id)}>
                              <Text fontWeight="semibold">{item.title}</Text>
                            </Checkbox>
                            <Tag colorScheme="indigo" variant="outline">
                              {item.category || 'trip prep'}
                            </Tag>
                          </Flex>
                        ))}
                      </Stack>
                    </CardBody>
                  </Card>

                  <BookingsCard bookings={bookings} onAddClick={bookingModal.onOpen} onDelete={handleDeleteBooking} />

                  <Card bg="#0f1828" color="whiteAlpha.900" border="1px solid rgba(255,255,255,0.12)">
                    <CardHeader pb={2}>
                      <Heading size="md" color="white">Spend so far</Heading>
                      <Text color="whiteAlpha.700" fontSize="sm">
                        Quick look at cash burn.
                      </Text>
                    </CardHeader>
                    <CardBody>
                      <Stack spacing={3}>
                        {(trip?.expenses || []).map((exp) => (
                          <Flex
                            key={exp.id}
                            justify="space-between"
                            p={3}
                            borderRadius="12px"
                            bg="whiteAlpha.100"
                            border="1px solid rgba(255,255,255,0.08)"
                          >
                            <Box>
                              <Text fontWeight="semibold">{exp.note || 'Expense'}</Text>
                              <Text color="whiteAlpha.700" fontSize="sm">
                                {exp.category || 'misc'}
                              </Text>
                            </Box>
                            <Tag colorScheme="brand" variant="subtle">
                              {exp.amount} {exp.currency}
                            </Tag>
                          </Flex>
                        ))}
                        <Button variant="ghost" onClick={expenseModal.onOpen}>
                          + Add expense
                        </Button>
                      </Stack>
                    </CardBody>
                  </Card>

                  <Card bg="#0f1828" color="whiteAlpha.900" border="1px solid rgba(255,255,255,0.12)">
                    <CardHeader pb={2}>
                      <Heading size="md" color="white">Moments</Heading>
                      <Text color="whiteAlpha.700" fontSize="sm">
                        Drop photos and links; connect to `/trips/:id/media` when live.
                      </Text>
                    </CardHeader>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <Button variant="ghost">Upload snapshot</Button>
                        <Button variant="ghost">Copy shared album link</Button>
                      </VStack>
                      <Divider my={4} borderColor="whiteAlpha.200" />
                      <Text color="whiteAlpha.700" fontSize="sm">
                        Save your best konbini hauls, city sunsets, and ramen bowls.
                      </Text>
                    </CardBody>
                  </Card>
                </Stack>
              </SimpleGrid>
            </TabPanel>

            <TabPanel px={0} bg="transparent" color="whiteAlpha.900">
              <Card bg="#0f1828" color="whiteAlpha.900" border="1px solid rgba(255,255,255,0.12)">
                <CardHeader pb={2}>
                  <Heading size="md" color="white">Calendar</Heading>
                  <Text color="whiteAlpha.700" fontSize="sm">
                    One-glance view of days and activities.
                  </Text>
                </CardHeader>
                <CardBody>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {daysGrid.map((dayDate) => {
                      const iso = format(dayDate, 'yyyy-MM-dd');
                      const dayData = sortedDays.find((d) => d.date?.slice(0, 10) === iso);
                      const activities = dayData?.activities || [];
                      return (
                        <Box
                          key={`cal-${iso}`}
                          p={4}
                          borderRadius="14px"
                          bg="#0f1828"
                          border="1px solid rgba(255,255,255,0.12)"
                        >
                          <Stack spacing={3}>
                            <Flex justify="space-between" align="center">
                              <Heading size="sm" color="white">
                                {format(dayDate, 'EEE dd')}
                              </Heading>
                              <HStack spacing={2}>
                                <Tag colorScheme="indigo" variant="subtle">
                                  {activities.length} items
                                </Tag>
                                {dayData?.city && (
                                  <Tag bg={cityColorMap.get(dayData.city.id)} color={cityColorMap.get(dayData.city.id) ? '#0c0c0c' : undefined}>
                                    {dayData.city.name}
                                  </Tag>
                                )}
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => {
                    setSelectedDayId(dayData?.id || null);
                    setSelectedDayDate(dayData?.date || format(dayDate, 'yyyy-MM-dd'));
                    setEditingActivityId(null);
                    setActivityForm({
                      title: '',
                      startTime: dayData ? `${format(dayData.date, 'yyyy-MM-dd')}T` : `${format(dayDate, 'yyyy-MM-dd')}T`,
                      location: '',
                      category: '',
                      cityId: dayData?.cityId || '',
                    });
                    activityModal.onOpen();
                  }}
                >
                  + Add
                  </Button>
                              </HStack>
                            </Flex>
                            <Text color="whiteAlpha.700" fontSize="sm">
                              {dayData?.title || 'Free day'}
                            </Text>
                            <Divider borderColor="whiteAlpha.200" />
                            <Stack spacing={2}>
                              {activities.length === 0 && (
                                <Text color="whiteAlpha.700" fontSize="sm">
                                  No plans yet.
                                </Text>
                              )}
                              {activities.map((act) => (
                                <Flex key={`cal-act-${act.id}`} align="center" justify="space-between" gap={2}>
                                  <Box>
                                    <Text fontWeight="semibold" color="white">
                                      {act.title}
                                    </Text>
                                    <Text color="whiteAlpha.700" fontSize="sm">
                                      {formatActivityTime(act)} · {act.location || 'TBD'}
                                    </Text>
                                  </Box>
                                  <HStack>
                                    <Tag size="sm" colorScheme="brand" variant="subtle">
                                      {act.category || 'plan'}
                                    </Tag>
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                    onClick={() => {
                                      setSelectedDayId(dayData?.id || null);
                                      setSelectedDayDate(dayData?.date || iso);
                                      setEditingActivityId(act.id);
                                      setActivityForm({
                                        title: act.title || '',
                                        startTime: act.startTime ? new Date(act.startTime).toISOString().slice(0, 16) : '',
                                        location: act.location || '',
                                        category: act.category || '',
                                        cityId: act.city?.id || dayData?.cityId || '',
                                      });
                                      activityModal.onOpen();
                                    }}
                                  >
                                    Edit
                                    </Button>
                                  </HStack>
                                </Flex>
                              ))}
                            </Stack>
                          </Stack>
                        </Box>
                      );
                    })}
                  </SimpleGrid>
                </CardBody>
              </Card>
            </TabPanel>

            <TabPanel px={0} bg="transparent" color="whiteAlpha.900">
              {undoPlace && (
                <Box
                  mb={3}
                  p={3}
                  borderRadius="12px"
                  bg="yellow.100"
                  color="gray.900"
                  border="1px solid rgba(0,0,0,0.08)"
                >
                  <Flex align="center" justify="space-between" gap={3}>
                    <Text>Place deleted: {undoPlace.name}. Undo?</Text>
                    <HStack>
                      <Button size="sm" onClick={handleUndoDeletePlace}>
                        Undo
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setUndoPlace(null);
                          if (undoTimer) clearTimeout(undoTimer);
                        }}
                      >
                        Dismiss
                      </Button>
                    </HStack>
                  </Flex>
                </Box>
              )}
              <PlacesBoard
                places={places}
                cities={cities}
                cityFilter={placeFilter.cityId}
                tagFilter={placeFilter.tag}
                search={placeSearch}
                sort={placeSort}
                groupBy={placeGroupBy}
                view={placeView}
                favorites={placeFavorites}
                favoritesOnly={placeFavoritesOnly}
                onToggleFavoritesOnly={(val) => setPlaceFavoritesOnly(val)}
                onToggleFavorite={togglePlaceFavorite}
                onViewChange={setPlaceView}
                onSearchChange={setPlaceSearch}
                onSortChange={setPlaceSort}
                onGroupChange={setPlaceGroupBy}
                onFilterChange={(next) => setPlaceFilter(next)}
                dayOptions={daysGrid.map((date) => {
                  const iso = format(date, 'yyyy-MM-dd');
                  const existing = sortedDays.find((d) => d.date?.slice(0, 10) === iso);
                  return {
                    id: existing?.id || `date:${iso}`,
                    label: `${format(date, 'EEE dd MMM')} — ${existing?.title || 'New day'}`,
                    iso,
                  };
                })}
                onQuickPromote={handleQuickPromotePlace}
                onAddClick={() => {
                  if (!trip?.id) {
                    toast({ status: 'warning', title: 'Create a trip first' });
                    return;
                  }
                  setEditingPlaceId(null);
                  setPlaceForm({ name: '', address: '', lat: '', lng: '', tag: '', link: '', notes: '', cityId: '' });
                  placeModal.onOpen();
                }}
                onSaveFromLink={handleSavePlaceFromLink}
                onPromote={(place) => {
                  setPlacePromote({
                    placeId: place.id,
                    dayId: '',
                    startTime: '',
                    location: place.address || place.name,
                    category: place.tag || '',
                  });
                  promotePlaceModal.onOpen();
                }}
                onEdit={(place) => {
                  setEditingPlaceId(place.id);
                  setPlaceForm({
                    name: place.name || '',
                    address: place.address || '',
                    lat: place.lat ?? '',
                    lng: place.lng ?? '',
                    tag: place.tag || '',
                    link: place.link || '',
                    notes: place.notes || '',
                    cityId: place.cityId || '',
                  });
                  placeModal.onOpen();
                }}
                onDelete={handleDeletePlace}
              />
            </TabPanel>

            <TabPanel px={0} bg="transparent" color="whiteAlpha.900">
              <IdeasBoard
                ideas={ideas}
                cities={cities}
                cityFilter={cityFilter}
                onFilterChange={(id) => setCityFilter(id)}
                onAddClick={(idea) => {
                  if (idea) {
                    setEditingIdeaId(idea.id);
                    setIdeaForm({
                      title: idea.title || '',
                      link: idea.link || '',
                      note: idea.note || '',
                      category: idea.category || '',
                      cityId: idea.cityId || '',
                    });
                  } else {
                    setEditingIdeaId(null);
                    setIdeaForm({ title: '', link: '', note: '', category: '', cityId: '' });
                  }
                  ideaModal.onOpen();
                }}
                onDelete={handleDeleteIdea}
                onPromote={(idea) => {
                  setIdeaPromote({
                    ideaId: idea.id,
                    dayId: '',
                    startTime: '',
                    location: '',
                    category: idea.category || '',
                  });
                  promoteIdeaModal.onOpen();
                }}
                onReorder={(movingId, beforeId) => {
                  if (!trip?.id) return;
                  const order = ideas
                    .slice()
                    .map((i) => i.id)
                    .filter((id) => id !== movingId);
                  const insertIndex = order.indexOf(beforeId);
                  if (insertIndex === -1) {
                    order.push(movingId);
                  } else {
                    order.splice(insertIndex, 0, movingId);
                  }
                  reorderIdeas(trip.id, order)
                    .then((updated) => setIdeas(updated))
                    .catch((err) => toast({ status: 'error', title: 'Failed to reorder ideas', description: err.message }));
                }}
                onSaveAsPlace={handleSaveIdeaAsPlace}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>

      <Modal isOpen={cityModal.isOpen} onClose={cityModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent bg="#0f1624" border="1px solid rgba(255,255,255,0.08)">
          <ModalHeader>{editingCityId ? 'Edit city' : 'Add city'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>City name</FormLabel>
                <Input
                  placeholder="Osaka"
                  value={cityForm.name}
                  onChange={(e) => setCityForm((f) => ({ ...f, name: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Country</FormLabel>
                <Input
                  placeholder="Japan"
                  value={cityForm.country}
                  onChange={(e) => setCityForm((f) => ({ ...f, country: e.target.value }))}
                />
              </FormControl>
              <HStack>
                <FormControl>
                  <FormLabel>Start date</FormLabel>
                  <Input
                    type="date"
                    value={cityForm.startDate}
                    onChange={(e) => setCityForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>End date</FormLabel>
                  <Input
                    type="date"
                    value={cityForm.endDate}
                    onChange={(e) => setCityForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </FormControl>
              </HStack>
              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Input
                  placeholder="Staying near Namba"
                  value={cityForm.notes}
                  onChange={(e) => setCityForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </FormControl>
            </Stack>
            <Divider my={4} borderColor="whiteAlpha.200" />
            <Stack spacing={2}>
              {(cities || []).map((city) => (
                <Flex
                  key={city.id}
                  align="center"
                  justify="space-between"
                  p={3}
                  borderRadius="12px"
                  bg="whiteAlpha.100"
                  border="1px solid rgba(255,255,255,0.08)"
                  gap={2}
                >
                  <Box>
                    <Text fontWeight="semibold">{city.name}</Text>
                    <Text color="whiteAlpha.700" fontSize="sm">
                      {city.country || ''} {city.startDate ? `· ${format(new Date(city.startDate), 'MMM d')}` : ''}
                      {city.endDate ? ` — ${format(new Date(city.endDate), 'MMM d')}` : ''}
                    </Text>
                  </Box>
                  <HStack>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingCityId(city.id);
                        setCityForm({
                          name: city.name || '',
                          country: city.country || '',
                          startDate: city.startDate ? city.startDate.slice(0, 10) : '',
                          endDate: city.endDate ? city.endDate.slice(0, 10) : '',
                          notes: city.notes || '',
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteCity(city.id)}>
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const idx = cities.findIndex((c) => c.id === city.id);
                        if (idx <= 0) return;
                        handleReorderCities(city.id, cities[idx - 1].id);
                      }}
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const idx = cities.findIndex((c) => c.id === city.id);
                        if (idx === -1 || idx === cities.length - 1) return;
                        handleReorderCities(cities[idx + 1].id, city.id);
                      }}
                    >
                      ↓
                    </Button>
                  </HStack>
                </Flex>
              ))}
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                setEditingCityId(null);
                setCityForm({ name: '', country: '', startDate: '', endDate: '', notes: '' });
                cityModal.onClose();
              }}
            >
              Close
            </Button>
            <Button onClick={handleCreateOrUpdateCity}>{editingCityId ? 'Save city' : 'Add city'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal isOpen={dayModal.isOpen} onClose={dayModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="#0f1624" border="1px solid rgba(255,255,255,0.08)">
          <ModalHeader>Add day</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>Date</FormLabel>
                <Input type="date" value={dayForm.date} onChange={(e) => setDayForm((f) => ({ ...f, date: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel>Title</FormLabel>
                <Input
                  placeholder="Kyoto temples"
                  value={dayForm.title}
                  onChange={(e) => setDayForm((f) => ({ ...f, title: e.target.value }))}
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={dayModal.onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreateDay}>Add day</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={activityModal.isOpen} onClose={() => { setEditingActivityId(null); activityModal.onClose(); }} isCentered>
        <ModalOverlay />
        <ModalContent bg="#0f1624" border="1px solid rgba(255,255,255,0.08)">
          <ModalHeader>{editingActivityId ? 'Edit activity' : 'Add activity'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>Day</FormLabel>
                <Select
                  placeholder="Select day"
                  value={
                    selectedDayId
                      ? String(selectedDayId)
                      : selectedDayDate
                        ? `date:${selectedDayDate}`
                        : ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('date:')) {
                      const iso = val.replace('date:', '');
                      setSelectedDayId(null);
                      setSelectedDayDate(iso);
                    } else {
                      setSelectedDayId(val ? Number(val) : null);
                      setSelectedDayDate('');
                    }
                  }}
                >
                  {dayOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Activity title</FormLabel>
                <Input
                  placeholder="Sushi breakfast at Toyosu"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm((f) => ({ ...f, title: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Start time</FormLabel>
                <Input
                  type="datetime-local"
                  value={activityForm.startTime}
                  onChange={(e) => setActivityForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </FormControl>
              <HStack>
                <FormControl>
                  <FormLabel>Location</FormLabel>
                  <Input
                    placeholder="Shibuya"
                    value={activityForm.location}
                    onChange={(e) => setActivityForm((f) => ({ ...f, location: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Category</FormLabel>
                  <Input
                    placeholder="food"
                    value={activityForm.category}
                    onChange={(e) => setActivityForm((f) => ({ ...f, category: e.target.value }))}
                  />
                </FormControl>
              </HStack>
              <FormControl>
                <FormLabel>City</FormLabel>
                <Select
                  placeholder="Optional"
                  value={activityForm.cityId || ''}
                  onChange={(e) => setActivityForm((f) => ({ ...f, cityId: e.target.value }))}
                >
                  {(cities || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                setEditingActivityId(null);
                setActivityForm({ title: '', startTime: '', location: '', category: '' });
                activityModal.onClose();
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingActivityId ? handleUpdateActivity : handleCreateActivity}>
              {editingActivityId ? 'Update activity' : 'Add activity'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={placeModal.isOpen} onClose={() => { setEditingPlaceId(null); placeModal.onClose(); }} isCentered>
        <ModalOverlay />
        <ModalContent bg="#0f1624" border="1px solid rgba(255,255,255,0.08)">
          <ModalHeader>{editingPlaceId ? 'Edit place' : 'Add place'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  placeholder="Sushi Dai"
                  value={placeForm.name}
                  onChange={(e) => setPlaceForm((f) => ({ ...f, name: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Address</FormLabel>
                <Input
                  placeholder="Tsukiji Market, Tokyo"
                  value={placeForm.address}
                  onChange={(e) => setPlaceForm((f) => ({ ...f, address: e.target.value }))}
                />
              </FormControl>
              <HStack>
                <FormControl>
                  <FormLabel>Lat</FormLabel>
                  <Input
                    placeholder="35.665"
                    value={placeForm.lat}
                    onChange={(e) => setPlaceForm((f) => ({ ...f, lat: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Lng</FormLabel>
                  <Input
                    placeholder="139.770"
                    value={placeForm.lng}
                    onChange={(e) => setPlaceForm((f) => ({ ...f, lng: e.target.value }))}
                  />
                </FormControl>
              </HStack>
              <FormControl>
                <FormLabel>Tag</FormLabel>
                <Select
                  placeholder="Select tag"
                  value={placeForm.tag}
                  onChange={(e) => setPlaceForm((f) => ({ ...f, tag: e.target.value }))}
                >
                  <option value="food">Food</option>
                  <option value="culture">Culture</option>
                  <option value="shop">Shop</option>
                  <option value="nature">Nature</option>
                  <option value="nightlife">Nightlife</option>
                  <option value="transport">Transport</option>
                  <option value="misc">Misc</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Link</FormLabel>
                <Input
                  placeholder="https://maps.app.goo.gl/..."
                  value={placeForm.link}
                  onChange={(e) => setPlaceForm((f) => ({ ...f, link: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Input
                  placeholder="Opens early, cash only"
                  value={placeForm.notes}
                  onChange={(e) => setPlaceForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>City</FormLabel>
                <Select
                  placeholder="Select city"
                  value={placeForm.cityId}
                  onChange={(e) => setPlaceForm((f) => ({ ...f, cityId: e.target.value }))}
                >
                  {(cities || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                setEditingPlaceId(null);
                setPlaceForm({ name: '', address: '', lat: '', lng: '', tag: '', link: '', notes: '', cityId: '' });
                placeModal.onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!placeForm.name) {
                  toast({ status: 'warning', title: 'Place name required' });
                  return;
                }
                if (!placeForm.cityId) {
                  toast({ status: 'warning', title: 'City is required' });
                  return;
                }
                try {
                  if (editingPlaceId) {
                    await updatePlace(editingPlaceId, {
                      name: placeForm.name,
                      address: placeForm.address || null,
                      lat: placeForm.lat ? Number(placeForm.lat) : null,
                      lng: placeForm.lng ? Number(placeForm.lng) : null,
                      tag: placeForm.tag || null,
                      link: placeForm.link || null,
                      notes: placeForm.notes || null,
                      cityId: Number(placeForm.cityId),
                    });
                  } else {
                    await createPlace(trip.id, {
                      name: placeForm.name,
                      address: placeForm.address || null,
                      lat: placeForm.lat ? Number(placeForm.lat) : null,
                      lng: placeForm.lng ? Number(placeForm.lng) : null,
                      tag: placeForm.tag || null,
                      link: placeForm.link || null,
                      notes: placeForm.notes || null,
                      cityId: Number(placeForm.cityId),
                    });
                  }
                  const refreshed = await fetchPlaces(trip.id);
                  setPlaces(refreshed);
                  setPlaceForm({ name: '', address: '', lat: '', lng: '', tag: '', link: '', notes: '', cityId: '' });
                  setEditingPlaceId(null);
                  placeModal.onClose();
                  toast({ status: 'success', title: editingPlaceId ? 'Place updated' : 'Place added' });
                } catch (err) {
                  toast({ status: 'error', title: 'Failed to save place', description: err.message });
                }
              }}
            >
              {editingPlaceId ? 'Save place' : 'Add place'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={expenseModal.isOpen} onClose={expenseModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="#0f1624" border="1px solid rgba(255,255,255,0.08)">
          <ModalHeader>Add expense</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <HStack align="flex-start">
                <FormControl>
                  <FormLabel>Amount</FormLabel>
                  <Input
                    type="number"
                    placeholder="5000"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Currency</FormLabel>
                  <Input
                    placeholder="JPY"
                    value={expenseForm.currency}
                    onChange={(e) => setExpenseForm((f) => ({ ...f, currency: e.target.value }))}
                  />
                </FormControl>
              </HStack>
              <FormControl>
                <FormLabel>Category</FormLabel>
                <Input
                  placeholder="food / transport"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Note</FormLabel>
                <Input
                  placeholder="Suica top-up"
                  value={expenseForm.note}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, note: e.target.value }))}
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={expenseModal.onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreateExpense}>Add expense</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={ideaModal.isOpen} onClose={ideaModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="#0f1624" border="1px solid rgba(255,255,255,0.08)">
          <ModalHeader>Add idea</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>Title</FormLabel>
                <Input
                  placeholder="Yakitori spot in Shinjuku"
                  value={ideaForm.title}
                  onChange={(e) => setIdeaForm((f) => ({ ...f, title: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select
                  placeholder="Select category"
                  value={ideaForm.category}
                  onChange={(e) => setIdeaForm((f) => ({ ...f, category: e.target.value }))}
                >
                  <option value="food">Food</option>
                  <option value="culture">Culture</option>
                  <option value="shop">Shop</option>
                  <option value="nature">Nature</option>
                  <option value="nightlife">Nightlife</option>
                  <option value="transport">Transport</option>
                  <option value="misc">Misc</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>City</FormLabel>
                <Select
                  placeholder="Optional"
                  value={ideaForm.cityId || ''}
                  onChange={(e) => setIdeaForm((f) => ({ ...f, cityId: e.target.value }))}
                >
                  {(cities || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Link</FormLabel>
                <Input
                  placeholder="https://maps.app.goo.gl/..."
                  value={ideaForm.link}
                  onChange={(e) => setIdeaForm((f) => ({ ...f, link: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Note</FormLabel>
                <Input
                  placeholder="Opens late, cash only"
                  value={ideaForm.note}
                  onChange={(e) => setIdeaForm((f) => ({ ...f, note: e.target.value }))}
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                setEditingIdeaId(null);
                setIdeaForm({ title: '', link: '', note: '', category: '' });
                ideaModal.onClose();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateOrUpdateIdea}>{editingIdeaId ? 'Save changes' : 'Add idea'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={promoteIdeaModal.isOpen} onClose={promoteIdeaModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="#0f1624" border="1px solid rgba(255,255,255,0.08)">
          <ModalHeader>Promote idea to activity</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>Day</FormLabel>
                <Select
                  placeholder="Select day"
                  value={ideaPromote.dayId}
                  onChange={(e) => setIdeaPromote((f) => ({ ...f, dayId: e.target.value }))}
                >
                  {dayOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Start time</FormLabel>
                <Input
                  type="datetime-local"
                  value={ideaPromote.startTime}
                  onChange={(e) => setIdeaPromote((f) => ({ ...f, startTime: e.target.value }))}
                />
              </FormControl>
              <HStack>
                <FormControl>
                  <FormLabel>Location</FormLabel>
                  <Input
                    placeholder="Shibuya"
                    value={ideaPromote.location}
                    onChange={(e) => setIdeaPromote((f) => ({ ...f, location: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Category</FormLabel>
                  <Input
                    placeholder="food / culture"
                    value={ideaPromote.category}
                    onChange={(e) => setIdeaPromote((f) => ({ ...f, category: e.target.value }))}
                  />
                </FormControl>
              </HStack>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={promoteIdeaModal.onClose}>
              Cancel
            </Button>
            <Button onClick={handlePromoteIdea}>Promote</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={promotePlaceModal.isOpen} onClose={promotePlaceModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="#0f1624" border="1px solid rgba(255,255,255,0.08)">
          <ModalHeader>Promote place to activity</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>Day</FormLabel>
                <Select
                  placeholder="Select day"
                  value={placePromote.dayId}
                  onChange={(e) => setPlacePromote((f) => ({ ...f, dayId: e.target.value }))}
                >
                  {dayOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Start time</FormLabel>
                <Input
                  type="datetime-local"
                  value={placePromote.startTime}
                  onChange={(e) => setPlacePromote((f) => ({ ...f, startTime: e.target.value }))}
                />
              </FormControl>
              <HStack>
                <FormControl>
                  <FormLabel>Location</FormLabel>
                  <Input
                    placeholder="Shibuya"
                    value={placePromote.location}
                    onChange={(e) => setPlacePromote((f) => ({ ...f, location: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Category</FormLabel>
                  <Input
                    placeholder="food / culture"
                    value={placePromote.category}
                    onChange={(e) => setPlacePromote((f) => ({ ...f, category: e.target.value }))}
                  />
                </FormControl>
              </HStack>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={promotePlaceModal.onClose}>
              Cancel
            </Button>
            <Button onClick={handlePromotePlace}>Promote</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={bookingModal.isOpen} onClose={bookingModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="#0f1624" border="1px solid rgba(255,255,255,0.08)">
          <ModalHeader>Add booking</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>Title</FormLabel>
                <Input
                  placeholder="Hotel check-in, JR ticket, flight"
                  value={bookingForm.title}
                  onChange={(e) => setBookingForm((f) => ({ ...f, title: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Type</FormLabel>
                <Input
                  placeholder="flight / hotel / train / ticket"
                  value={bookingForm.type}
                  onChange={(e) => setBookingForm((f) => ({ ...f, type: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Date & time</FormLabel>
                <Input
                  type="datetime-local"
                  value={bookingForm.dateTime}
                  onChange={(e) => setBookingForm((f) => ({ ...f, dateTime: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Location</FormLabel>
                <Input
                  placeholder="Shinjuku station"
                  value={bookingForm.location}
                  onChange={(e) => setBookingForm((f) => ({ ...f, location: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Confirmation code</FormLabel>
                <Input
                  placeholder="PNR / booking ref"
                  value={bookingForm.confirmationCode}
                  onChange={(e) => setBookingForm((f) => ({ ...f, confirmationCode: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Link (PDF / booking)</FormLabel>
                <Input
                  placeholder="https://..."
                  value={bookingForm.link}
                  onChange={(e) => setBookingForm((f) => ({ ...f, link: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Note</FormLabel>
                <Input
                  placeholder="Check-in 3pm, bring passport"
                  value={bookingForm.note}
                  onChange={(e) => setBookingForm((f) => ({ ...f, note: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Attach to day</FormLabel>
                <Select
                  placeholder="Optional"
                  value={bookingForm.dayId}
                  onChange={(e) => setBookingForm((f) => ({ ...f, dayId: e.target.value }))}
                >
                  {dayOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>City</FormLabel>
                <Select
                  placeholder="Optional"
                  value={bookingForm.cityId}
                  onChange={(e) => setBookingForm((f) => ({ ...f, cityId: e.target.value }))}
                >
                  {(cities || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={bookingModal.onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreateBooking}>Add booking</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={tripModal.isOpen} onClose={tripModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="#0f1624" border="1px solid rgba(255,255,255,0.08)">
          <ModalHeader>Create a trip</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>Trip name</FormLabel>
                <Input
                  placeholder="Tokyo + Kyoto"
                  value={tripForm.name}
                  onChange={(e) => setTripForm((f) => ({ ...f, name: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Start date</FormLabel>
                <Input
                  type="date"
                  value={tripForm.startDate}
                  onChange={(e) => setTripForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>End date</FormLabel>
                <Input
                  type="date"
                  value={tripForm.endDate}
                  onChange={(e) => setTripForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={tripModal.onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreateTrip}>Create trip</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}

export default App;
