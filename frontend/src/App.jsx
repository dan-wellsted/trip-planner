import React, { useEffect, useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { Routes, Route, useLocation, useNavigate, Navigate, Link as RouterLink } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  CheckboxGroup,
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
  reorderActivities,
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
  updateDay,
  register,
  login,
  logout as apiLogout,
  me as fetchMe,
  addTripMember,
} from './api';
import BookingsCard from './components/BookingsCard';
import IdeasBoard from './components/IdeasBoard';
import PlacesBoard from './components/PlacesBoard';
import ActivitiesList from './components/ActivitiesList';

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

function activityDurationMinutes(activity) {
  if (activity?.startTime && activity?.endTime) {
    const start = new Date(activity.startTime);
    const end = new Date(activity.endTime);
    const diff = Math.max(0, end - start);
    return Math.max(15, Math.round(diff / 60000));
  }
  return 60;
}

function toNumber(val) {
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

function haversineDistanceKm(a, b) {
  const lat1 = toNumber(a?.lat);
  const lon1 = toNumber(a?.lng);
  const lat2 = toNumber(b?.lat);
  const lon2 = toNumber(b?.lng);
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const aVal =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

function estimateTravelMinutes(prev, next) {
  if (!prev || !next) return 0;
  const km = haversineDistanceKm(prev, next);
  if (km !== null) {
    if (km < 0.8) return 10;
    if (km < 3) return 18;
    if (km < 10) return 32;
    if (km < 30) return 60;
    if (km < 75) return 95;
    return 120;
  }
  if (prev.cityId && next.cityId && prev.cityId === next.cityId) return 20;
  return 45;
}

function computeLeaveBy(prev, next, travelMinutes) {
  if (!prev?.startTime || !next?.startTime) return '';
  const travel = Number.isFinite(travelMinutes) ? travelMinutes : estimateTravelMinutes(prev, next);
  const nextStart = new Date(next.startTime);
  const leaveBy = new Date(nextStart.getTime() - (travel || 0) * 60000);
  const formatted = leaveBy.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return travel > 0 ? `Leave by ${formatted} to reach next stop` : '';
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
  const location = useLocation();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(fallbackTrip);
  const [trips, setTrips] = useState([]);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('Offline demo data');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDayId, setSelectedDayId] = useState(fallbackTrip.days?.[0]?.id || null);
  const [selectedDayDate, setSelectedDayDate] = useState(fallbackTrip.days?.[0]?.date || '');
  const [tripForm, setTripForm] = useState({ name: '', startDate: '', endDate: '' });
  const [dayForm, setDayForm] = useState({ date: '', title: '', cityIds: [] });
  const [editingDayId, setEditingDayId] = useState(null);
  const [activityForm, setActivityForm] = useState({ title: '', startTime: '', endTime: '', location: '', category: '', cityId: '' });
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
  const [quickPlaceAdd, setQuickPlaceAdd] = useState({});
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '', mode: 'login' });
  const [memberForm, setMemberForm] = useState({ email: '', role: 'editor' });
  const toast = useToast();

  const tripIdFromPath = useMemo(() => {
    const match = location.pathname.match(/\/trip\/(\d+)/);
    return match ? Number(match[1]) : null;
  }, [location.pathname]);

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
      const tripsResp = await fetchTripsApi();
      setTrips(Array.isArray(tripsResp) ? tripsResp : []);
      const idParam = tripIdFromPath;
      if (Array.isArray(tripsResp) && tripsResp.length > 0) {
        const desired = idParam ? tripsResp.find((t) => t.id === idParam) : null;
        const firstTrip = desired || (trip && tripsResp.find((t) => t.id === trip.id)) || tripsResp[0];
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
        if (idParam) {
          navigate('/');
        }
      }
    } catch (err) {
      if (err?.status === 401) {
        setStatus('Login to view your trips');
        setTrip(null);
        setTrips([]);
        setCities([]);
        setBookings([]);
        setIdeas([]);
        setPlaces([]);
        setSelectedDayId(null);
        setSelectedDayDate('');
        if (tripIdFromPath) {
          navigate('/');
        }
      } else {
        console.warn('Falling back to demo data', err);
        setStatus('Offline demo data');
        setError('API unavailable.');
        setTrip(null);
        setTrips([]);
        setSelectedDayId(null);
        setSelectedDayDate('');
        if (tripIdFromPath) {
          navigate('/');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const meResp = await fetchMe();
        setUser(meResp);
        await loadTrips();
      } catch (err) {
        setUser(null);
        setTrips([]);
        setTrip(null);
        setStatus('Login to view your trips');
        setCities([]);
        setBookings([]);
        setIdeas([]);
        setPlaces([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (user) {
      loadTrips();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tripIdFromPath]);

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

  const handleAuthSubmit = async (modeOverride) => {
    const mode = modeOverride || authForm.mode || 'login';
    if (!authForm.email || !authForm.password) {
      toast({ status: 'warning', title: 'Email and password required' });
      return;
    }
    try {
      if (mode === 'register') {
        await register({ email: authForm.email, password: authForm.password, name: authForm.name || null });
      } else {
        await login({ email: authForm.email, password: authForm.password });
      }
      const meResp = await fetchMe();
      setUser(meResp);
      toast({ status: 'success', title: mode === 'register' ? 'Registered' : 'Logged in' });
      await loadTrips();
    } catch (err) {
      toast({ status: 'error', title: 'Auth failed', description: err.message || 'Unable to sign in' });
    }
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (err) {
      // ignore
    }
    setUser(null);
    await loadTrips();
  };

  const handleAddMember = async () => {
    if (!trip?.id) {
      toast({ status: 'warning', title: 'Create a trip first' });
      return;
    }
    if (!memberForm.email) {
      toast({ status: 'warning', title: 'Email required' });
      return;
    }
    try {
      await addTripMember(trip.id, { email: memberForm.email, role: memberForm.role || 'editor' });
      toast({ status: 'success', title: 'Member added/updated' });
      setMemberForm({ email: '', role: 'editor' });
      await loadTrips();
    } catch (err) {
      toast({ status: 'error', title: 'Failed to add member', description: err.message });
    }
  };

  const currentRole = useMemo(() => {
    if (!user || !trip) return null;
    if (trip.ownerId && trip.ownerId === user.id) return 'owner';
    const mem = (trip.memberships || []).find((m) => m.userId === user.id);
    return mem?.role || null;
  }, [trip, user]);
  const canEditTrip = !user || !trip ? true : currentRole !== 'viewer';

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
        cityId: existing?.cityId || existing?.cityIds?.[0] || null,
      });
    }
    return options;
  })();
  const cityColors = ['brand.300', 'indigo.500', 'green.400', 'orange.400', 'pink.400', 'cyan.400'];
  const cityColorMap = new Map(cities.map((c, idx) => [c.id, cityColors[idx % cityColors.length]]));
  const visibleDays = cityFilter
    ? sortedDays.filter((d) => (Array.isArray(d.cityIds) ? d.cityIds.includes(cityFilter) : d.cityId === cityFilter))
    : sortedDays;

  const handleCreateTrip = async () => {
    if (!tripForm.name) {
      toast({ status: 'warning', title: 'Trip name required' });
      return;
    }
    try {
      const created = await createTrip({
        name: tripForm.name,
        startDate: tripForm.startDate || null,
        endDate: tripForm.endDate || null,
      });
      await loadTrips();
      if (created?.id) {
        navigate(`/trip/${created.id}`);
      }
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

  const handleQuickAddPlaceToDay = async (day) => {
    if (!day?.id) return;
    const entry = quickPlaceAdd[day.id] || {};
    const placeId = entry.placeId ? Number(entry.placeId) : null;
    const place = places.find((p) => p.id === placeId);
    if (!place) {
      toast({ status: 'warning', title: 'Pick a place to add' });
      return;
    }
    const time = entry.time || '';
    const dateIso = day.date?.slice(0, 10) || '';
    const startTime = time && dateIso ? `${dateIso}T${time}` : null;
    try {
      await promotePlace(place.id, {
        dayId: Number(day.id),
        startTime,
        location: place.address || place.name,
        category: place.tag || null,
      });
      await loadTrips();
      setQuickPlaceAdd((prev) => ({ ...prev, [day.id]: { placeId: '', time: '' } }));
      toast({ status: 'success', title: 'Added place to day' });
    } catch (err) {
      toast({ status: 'error', title: 'Failed to add place to day', description: err.message });
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
      if (editingDayId) {
        await updateDay(editingDayId, {
          title: dayForm.title || null,
          cityIds: Array.isArray(dayForm.cityIds) ? dayForm.cityIds.map((c) => Number(c)) : [],
        });
      } else {
        await createDay(trip.id, {
          date: dayForm.date,
          title: dayForm.title || null,
          cityIds: Array.isArray(dayForm.cityIds) ? dayForm.cityIds.map((c) => Number(c)) : [],
          cityId: null,
        });
      }
      await loadTrips();
      setDayForm({ date: '', title: '', cityIds: [] });
      setEditingDayId(null);
      dayModal.onClose();
      toast({ status: 'success', title: editingDayId ? 'Day updated' : 'Day added' });
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
        endTime: activityForm.endTime || null,
        location: activityForm.location || null,
        category: activityForm.category || null,
        cityId: activityForm.cityId ? Number(activityForm.cityId) : null,
      });
      await loadTrips();
      setActivityForm({ title: '', startTime: '', endTime: '', location: '', category: '', cityId: '' });
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
        endTime: activityForm.endTime || undefined,
        location: activityForm.location || undefined,
        category: activityForm.category || undefined,
        cityId: activityForm.cityId ? Number(activityForm.cityId) : undefined,
      });
      await loadTrips();
      setActivityForm({ title: '', startTime: '', endTime: '', location: '', category: '', cityId: '' });
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

  if (!user && status.includes('Login')) {
    return (
      <Container maxW="4xl" py={{ base: 10, md: 16 }}>
        <Stack spacing={6} align="flex-start">
          <Badge colorScheme="brand" px={3} py={1} borderRadius="full">
            Trip Companion
          </Badge>
          <Heading size="2xl">Plan trips together</Heading>
          <Text color="whiteAlpha.800">
            Sign in to access trips, days, places, and ideas. Your data stays scoped to your account.
          </Text>
          <Stack direction={{ base: 'column', md: 'row' }} spacing={3} w="100%">
            <Input
              placeholder="Email"
              value={authForm.email}
              onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))}
            />
            <Input
              placeholder="Name (optional)"
              value={authForm.name}
              onChange={(e) => setAuthForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Stack>
          <HStack spacing={3}>
            <Button onClick={() => handleAuthSubmit('login')}>Login</Button>
            <Button variant="ghost" onClick={() => handleAuthSubmit('register')}>Register</Button>
          </HStack>
        </Stack>
      </Container>
    );
  }

  const isTripRoute = Boolean(tripIdFromPath);

  const navBar = (activeTripId) => (
    <ButtonGroup variant="ghost" spacing={2} mb={4}>
      {[
        { label: 'Dashboard', path: `/trip/${activeTripId}` },
        { label: 'Calendar', path: `/trip/${activeTripId}/calendar` },
        { label: 'Places', path: `/trip/${activeTripId}/places` },
        { label: 'Ideas', path: `/trip/${activeTripId}/ideas` },
      ].map((item) => {
        const normalizedPath = (location.pathname || '/').replace(/\/+$/, '') || '/';
        const active = normalizedPath === item.path || normalizedPath.startsWith(`${item.path}`);
        return (
          <Button
            key={item.path}
            as={RouterLink}
            to={item.path}
            px={4}
            py={2}
            borderRadius="md"
            bg={active ? 'indigo.600' : 'whiteAlpha.100'}
            color={active ? 'white' : 'whiteAlpha.800'}
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            {item.label}
          </Button>
        );
      })}
      <Button as={RouterLink} to="/" variant="ghost" px={4} py={2}>
        Back to trips
      </Button>
    </ButtonGroup>
  );

  if (!isTripRoute) {
    return (
      <Container maxW="6xl" py={{ base: 8, md: 12 }}>
        <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={3}>
          <HStack spacing={3}>
            <Badge colorScheme="brand" px={3} py={1} borderRadius="full">
              Trip Companion
            </Badge>
            <Tag colorScheme={status.includes('Live') ? 'green' : 'purple'} variant="subtle">
              {status}
            </Tag>
          </HStack>
          {user ? (
            <HStack spacing={3}>
              <Tag colorScheme="green" variant="subtle">
                {user.email}
              </Tag>
              <Button size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </HStack>
          ) : null}
        </Flex>
        <Stack spacing={6}>
          <Heading size="xl">Your trips</Heading>
          {trips.length > 0 ? (
            <Card bg="#0f1828" color="whiteAlpha.900" border="1px solid rgba(255,255,255,0.12)">
              <CardBody>
                <Stack spacing={3}>
                  {trips.map((t) => (
                    <Flex key={`triplist-${t.id}`} align="center" justify="space-between" p={3} borderRadius="12px" bg="whiteAlpha.100" border="1px solid rgba(255,255,255,0.08)">
                      <Box>
                        <Text fontWeight="semibold">{t.name}</Text>
                        <Text color="whiteAlpha.700" fontSize="sm">
                          {t.startDate ? format(new Date(t.startDate), 'MMM d') : 'No dates'} {t.endDate ? `– ${format(new Date(t.endDate), 'MMM d')}` : ''}
                        </Text>
                      </Box>
                      <Button
                        size="sm"
                        onClick={() => {
                          setTrip(t);
                          setCities(t.cities || []);
                          setSelectedDayId(t.days?.[0]?.id || null);
                          setSelectedDayDate(t.days?.[0]?.date || t.startDate || '');
                          navigate(`/trip/${t.id}`);
                        }}
                      >
                        Open
                      </Button>
                    </Flex>
                  ))}
                </Stack>
              </CardBody>
            </Card>
          ) : (
            <Text color="whiteAlpha.700">No trips yet.</Text>
          )}
          <Button size="md" onClick={tripModal.onOpen}>
            + New trip
          </Button>
        </Stack>
      </Container>
    );
  }

  const activeTripId = tripIdFromPath || (trip?.id ? String(trip.id) : '');

  return (
    <Container maxW="6xl" py={{ base: 8, md: 12 }}>
      <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={3}>
        <HStack spacing={3}>
          <Badge colorScheme="brand" px={3} py={1} borderRadius="full">
            Trip Companion
          </Badge>
          <Tag colorScheme={status.includes('Live') ? 'green' : 'purple'} variant="subtle">
            {status}
          </Tag>
          {currentRole && (
            <Tag colorScheme={currentRole === 'viewer' ? 'yellow' : 'green'} variant="subtle">
              Role: {currentRole}
            </Tag>
          )}
        </HStack>
        {user ? (
          <HStack spacing={3}>
            <Tag colorScheme="green" variant="subtle">
              {user.email}
            </Tag>
            <Button size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </HStack>
        ) : null}
      </Flex>
      <Stack spacing={6}>
        <Stack spacing={3}>
          <Heading size="2xl" letterSpacing="-0.5px">
            {trip?.name || 'Your adventure'}
          </Heading>
          <Text color="whiteAlpha.800" maxW="3xl">
            Keep itinerary, packing, spend, and photo drops in one place. Built for quick glances on the move.
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
          {trips.length > 0 && (
            <Card bg="#0f1828" color="whiteAlpha.900" border="1px solid rgba(255,255,255,0.12)" mt={2}>
              <CardHeader pb={2}>
                <Heading size="sm" color="white">
                  My trips
                </Heading>
                <Text color="whiteAlpha.700" fontSize="sm">
                  Select a trip to view its planner.
                </Text>
              </CardHeader>
              <CardBody>
                <Stack spacing={2}>
                  {trips.map((t) => (
                    <Flex key={`trip-${t.id}`} align="center" justify="space-between" p={3} borderRadius="12px" bg="whiteAlpha.100" border="1px solid rgba(255,255,255,0.08)">
                      <Box>
                        <Text fontWeight="semibold">{t.name}</Text>
                        <Text color="whiteAlpha.700" fontSize="sm">
                          {t.startDate ? format(new Date(t.startDate), 'MMM d') : 'No dates'} {t.endDate ? `– ${format(new Date(t.endDate), 'MMM d')}` : ''}
                        </Text>
                      </Box>
                      <Button
                        size="sm"
                        onClick={() => {
                          setTrip(t);
                          setCities(t.cities || []);
                          setSelectedDayId(t.days?.[0]?.id || null);
                          setSelectedDayDate(t.days?.[0]?.date || t.startDate || '');
                          navigate(`/trip/${t.id}`);
                        }}
                      >
                        Open
                      </Button>
                    </Flex>
                  ))}
                </Stack>
              </CardBody>
            </Card>
          )}
          {navBar(activeTripId)}
        </Stack>

        <Box>
          <ButtonGroup variant="ghost" spacing={2} mb={4}>
            {[
              { label: 'Dashboard', path: '/' },
              { label: 'Calendar', path: '/calendar' },
              { label: 'Places', path: '/places' },
              { label: 'Ideas', path: '/ideas' },
            ].map((item) => {
              const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
              const active = item.path === '/'
                ? normalizedPath === '/'
                : normalizedPath === item.path || normalizedPath.startsWith(`${item.path}/`);
              return (
                <Button
                  key={item.path}
                  as={RouterLink}
                  to={item.path}
                  px={4}
                  py={2}
                  borderRadius="md"
                  bg={active ? 'indigo.600' : 'whiteAlpha.100'}
                  color={active ? 'white' : 'whiteAlpha.800'}
                  _hover={{ bg: 'whiteAlpha.200' }}
                >
                  {item.label}
                </Button>
              );
            })}
          </ButtonGroup>
          <Routes>
          <Routes>
            <Route
              path="/trip/:tripId"
              element={
                <Box>
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
                      const multiCities = (day.cityIds || [])
                        .map((id) => cities.find((c) => c.id === id))
                        .filter(Boolean);
                      const allCities = Array.from(new Map([...dayCities, ...multiCities, ...activityCities].map((c) => [c.id, c])).values());
                      const totalDuration = (day.activities || []).reduce(
                        (sum, act) => sum + activityDurationMinutes(act),
                        0
                      );
                      const dayOverbooked = totalDuration > 12 * 60;
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
                              {dayOverbooked && (
                                <Tag size="sm" colorScheme="red" variant="solid">
                                  Overbooked
                                </Tag>
                              )}
                              {allCities.map((c) => (
                                <Tag key={c.id} color={cityColorMap.get(c.id) ? '#0c0c0c' : undefined} bg={cityColorMap.get(c.id)}>
                                  {c.name}
                                </Tag>
                              ))}
                              <Flex align="center" gap={2}>
                                <Text color="whiteAlpha.700" fontSize="sm">
                                  {day.title || 'Untitled day'}
                                </Text>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingDayId(day.id);
                                    setDayForm({
                                      date: day.date?.slice(0, 10) || '',
                                      title: day.title || '',
                                      cityIds: (day.cityIds || (day.cityId ? [day.cityId] : [])).map((id) => String(id)),
                                    });
                                    dayModal.onOpen();
                                  }}
                                >
                                  Edit
                                </Button>
                              </Flex>
                            </HStack>
                          </Flex>
                          <Stack spacing={2} mb={3}>
                            <HStack spacing={2} flexWrap="wrap" align="flex-end">
                              <FormControl minW="220px">
                                <FormLabel fontSize="sm" color="whiteAlpha.700">
                                  Add a saved place
                                </FormLabel>
                                <Select
                                  placeholder="Choose place"
                                  value={quickPlaceAdd[day.id]?.placeId || ''}
                                  onChange={(e) =>
                                    setQuickPlaceAdd((prev) => ({
                                      ...prev,
                                      [day.id]: { ...(prev[day.id] || {}), placeId: e.target.value },
                                    }))
                                  }
                                >
                                  {places
                                    .filter((p) => {
                                      const allowedCities = Array.isArray(day.cityIds) && day.cityIds.length > 0 ? day.cityIds : day.cityId ? [day.cityId] : [];
                                      if (allowedCities.length === 0) return true;
                                      return allowedCities.includes(p.cityId);
                                    })
                                    .map((p) => (
                                      <option key={`quick-place-${p.id}`} value={p.id}>
                                        {p.name} {p.city ? `· ${p.city.name}` : ''}
                                      </option>
                                    ))}
                                </Select>
                              </FormControl>
                              <FormControl maxW="160px">
                                <FormLabel fontSize="sm" color="whiteAlpha.700">
                                  Time (optional)
                                </FormLabel>
                                <Input
                                  type="time"
                                  value={quickPlaceAdd[day.id]?.time || ''}
                                  onChange={(e) =>
                                    setQuickPlaceAdd((prev) => ({
                                      ...prev,
                                      [day.id]: { ...(prev[day.id] || {}), time: e.target.value },
                                    }))
                                  }
                                />
                              </FormControl>
                              <Button
                                mt={5}
                                size="sm"
                                variant="solid"
                                onClick={() => handleQuickAddPlaceToDay(day)}
                                isDisabled={!places || places.length === 0}
                              >
                                Add to day
                              </Button>
                            </HStack>
                          </Stack>
                          <ActivitiesList
                            activities={day.activities || []}
                            cities={cities}
                            dayOverbooked={dayOverbooked}
                            travelEstimate={(idx, acts) =>
                              idx === 0 ? 0 : estimateTravelMinutes(acts[idx - 1], acts[idx])
                            }
                            leaveBy={(idx, acts, travelMinutes) =>
                              idx === 0 ? '' : computeLeaveBy(acts[idx - 1], acts[idx], travelMinutes)
                            }
                            onEdit={(act) => {
                              setSelectedDayId(day.id);
                              setEditingActivityId(act.id);
                              setActivityForm({
                                title: act.title || '',
                                startTime: act.startTime ? new Date(act.startTime).toISOString().slice(0, 16) : '',
                                endTime: act.endTime ? new Date(act.endTime).toISOString().slice(0, 16) : '',
                                location: act.location || '',
                                category: act.category || '',
                                cityId: act.cityId || act.city?.id || day.cityId || day.cityIds?.[0] || '',
                              });
                              activityModal.onOpen();
                            }}
                            onDelete={(id) => handleDeleteActivity(id)}
                            onReorder={(movingId, overId) => {
                              if (!day.activities || day.activities.length === 0) return;
                              const order = day.activities.map((a) => a.id);
                              const from = order.indexOf(movingId);
                              const to = order.indexOf(overId);
                              if (from === -1 || to === -1) return;
                              const reordered = [...order];
                              const [moved] = reordered.splice(from, 1);
                              reordered.splice(to, 0, moved);
                              reorderActivities(day.id, reordered).then((updated) => {
                                setTrip((prev) => {
                                  if (!prev) return prev;
                                  const nextDays = (prev.days || []).map((d) =>
                                    d.id === day.id ? { ...d, activities: updated } : d
                                  );
                                  return { ...prev, days: nextDays };
                                });
                              });
                            }}
                          />
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
                </Box>
              }
            />

            <Route
              path="/trip/:tripId/calendar"
              element={
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
                      const totalDuration = activities.reduce((sum, act) => sum + activityDurationMinutes(act), 0);
                      const dayOverbooked = totalDuration > 12 * 60;
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
                                {dayOverbooked && (
                                  <Tag colorScheme="red" variant="solid">
                                    Overbooked
                                  </Tag>
                                )}
                                {(() => {
                                  const calendarCities = [
                                    ...(dayData?.city ? [dayData.city] : []),
                                    ...((dayData?.cityIds || [])
                                      .map((id) => cities.find((c) => c.id === id))
                                      .filter(Boolean)),
                                  ];
                                  const uniqCities = Array.from(new Map(calendarCities.map((c) => [c.id, c])).values());
                                  return uniqCities.map((c) => (
                                    <Tag key={`cal-city-${dayData?.id}-${c.id}`} bg={cityColorMap.get(c.id)} color={cityColorMap.get(c.id) ? '#0c0c0c' : undefined}>
                                      {c.name}
                                    </Tag>
                                  ));
                                })()}
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
                      cityId: dayData?.cityId || dayData?.cityIds?.[0] || '',
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
                                        cityId: act.city?.id || dayData?.cityId || dayData?.cityIds?.[0] || '',
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
              }
            />

            <Route
              path="/trip/:tripId/places"
              element={
                <Box>
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
                </Box>
              }
            />

            <Route
              path="/trip/:tripId/ideas"
              element={(
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
              )}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
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
      <Modal isOpen={dayModal.isOpen} onClose={() => { setEditingDayId(null); setDayForm({ date: '', title: '', cityIds: [] }); dayModal.onClose(); }} isCentered>
        <ModalOverlay />
        <ModalContent bg="#0f1624" border="1px solid rgba(255,255,255,0.08)">
          <ModalHeader>{editingDayId ? 'Edit day' : 'Add day'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>Date</FormLabel>
                <Input
                  type="date"
                  value={dayForm.date}
                  onChange={(e) => setDayForm((f) => ({ ...f, date: e.target.value }))}
                  isDisabled={Boolean(editingDayId)}
                />
              </FormControl>
                <FormControl>
                  <FormLabel>Title</FormLabel>
                  <Input
                    placeholder="Kyoto temples"
                    value={dayForm.title}
                    onChange={(e) => setDayForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </FormControl>
              <FormControl>
                <FormLabel>Cities for this day</FormLabel>
                <CheckboxGroup
                  value={dayForm.cityIds}
                  onChange={(vals) => setDayForm((f) => ({ ...f, cityIds: vals }))}
                >
                  <Stack direction="column" spacing={1}>
                    {(cities || []).map((c) => (
                      <Checkbox key={`day-city-${c.id}`} value={String(c.id)} colorScheme="brand">
                        {c.name}
                      </Checkbox>
                    ))}
                  </Stack>
                </CheckboxGroup>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                setEditingDayId(null);
                setDayForm({ date: '', title: '', cityIds: [] });
                dayModal.onClose();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateDay}>{editingDayId ? 'Save day' : 'Add day'}</Button>
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
              <Stack direction="column" spacing={3}>
                <FormControl>
                  <FormLabel>Start time</FormLabel>
                  <Input
                    type="datetime-local"
                    value={activityForm.startTime}
                    onChange={(e) => setActivityForm((f) => ({ ...f, startTime: e.target.value }))}
                    w="100%"
                    minW={0}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>End time</FormLabel>
                  <Input
                    type="datetime-local"
                    value={activityForm.endTime}
                    onChange={(e) => setActivityForm((f) => ({ ...f, endTime: e.target.value }))}
                    w="100%"
                    minW={0}
                  />
                </FormControl>
              </Stack>
              <Stack direction={{ base: 'column', md: 'row' }} spacing={3}>
                <FormControl>
                  <FormLabel>Location</FormLabel>
                  <Input
                    placeholder="Shibuya"
                    value={activityForm.location}
                    onChange={(e) => setActivityForm((f) => ({ ...f, location: e.target.value }))}
                    w="100%"
                    minW={0}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Category</FormLabel>
                  <Input
                    placeholder="food"
                    value={activityForm.category}
                    onChange={(e) => setActivityForm((f) => ({ ...f, category: e.target.value }))}
                    w="100%"
                    minW={0}
                  />
                </FormControl>
              </Stack>
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
                setActivityForm({ title: '', startTime: '', endTime: '', location: '', category: '', cityId: '' });
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
