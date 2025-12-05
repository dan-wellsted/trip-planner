import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.trip.findFirst();
  if (existing) {
    console.log('Trip already exists, skipping seed.');
    return;
  }

  const trip = await prisma.trip.create({
    data: {
      name: 'Japan 2026',
      startDate: new Date('2026-03-16'),
      endDate: new Date('2026-04-05'),
      homeTimeZone: 'Europe/Madrid',
    },
  });

  const cityData = [
    { name: 'Barcelona', country: 'Spain', position: 1, startDate: new Date('2026-03-16'), endDate: new Date('2026-03-16'), timeZone: 'Europe/Madrid' },
    { name: 'Beijing', country: 'China', position: 2, startDate: new Date('2026-03-16'), endDate: new Date('2026-03-17'), timeZone: 'Asia/Shanghai' },
    { name: 'Tokyo', country: 'Japan', position: 3, startDate: new Date('2026-03-17'), endDate: new Date('2026-03-31'), timeZone: 'Asia/Tokyo' },
    { name: 'Kyoto', country: 'Japan', position: 4, startDate: new Date('2026-04-01'), endDate: new Date('2026-04-03'), timeZone: 'Asia/Tokyo' },
    { name: 'Osaka', country: 'Japan', position: 5, startDate: new Date('2026-04-03'), endDate: new Date('2026-04-05'), timeZone: 'Asia/Tokyo' },
  ];

  const cities = [];
  for (const c of cityData) {
    const city = await prisma.city.create({
      data: { ...c, tripId: trip.id },
    });
    cities.push(city);
  }

  const cityByName = new Map(cities.map((c) => [c.name, c]));

  const dayEntries = [
    { date: new Date('2026-03-16'), title: 'Fly BCN → PEK', cityId: cityByName.get('Barcelona').id },
    { date: new Date('2026-03-17'), title: 'PEK → Tokyo arrival', cityId: cityByName.get('Beijing').id },
    { date: new Date('2026-03-18'), title: 'Shinjuku + Omoide Yokocho', cityId: cityByName.get('Tokyo').id },
    { date: new Date('2026-03-19'), title: 'Ghibli + Kichijoji', cityId: cityByName.get('Tokyo').id },
    { date: new Date('2026-03-31'), title: 'Fly to Kyoto', cityId: cityByName.get('Kyoto').id },
    { date: new Date('2026-04-01'), title: 'Kyoto temples', cityId: cityByName.get('Kyoto').id },
    { date: new Date('2026-04-03'), title: 'Osaka food crawl', cityId: cityByName.get('Osaka').id },
    { date: new Date('2026-04-05'), title: 'Fly back to BCN', cityId: cityByName.get('Osaka').id },
  ];

  const days = [];
  for (const entry of dayEntries) {
    const day = await prisma.day.create({
      data: {
        date: entry.date,
        title: entry.title,
        tripId: trip.id,
        cityId: entry.cityId,
      },
    });
    days.push(day);
  }

  const dayByDate = new Map(days.map((d) => [d.date.toISOString().slice(0, 10), d]));

  await prisma.activity.createMany({
    data: [
      { title: 'Depart Barcelona (CA846)', startTime: new Date('2026-03-16T11:25:00+01:00'), location: 'Barcelona T1 (BCN)', category: 'flight', dayId: dayByDate.get('2026-03-16').id, cityId: cityByName.get('Barcelona').id },
      { title: 'Arrive Beijing', startTime: new Date('2026-03-17T05:30:00+08:00'), location: 'Beijing Capital T3 (PEK)', category: 'flight', dayId: dayByDate.get('2026-03-16').id, cityId: cityByName.get('Beijing').id },
      { title: 'Depart Beijing (CA181)', startTime: new Date('2026-03-17T08:45:00+08:00'), location: 'Beijing Capital T3 (PEK)', category: 'flight', dayId: dayByDate.get('2026-03-17').id, cityId: cityByName.get('Beijing').id },
      { title: 'Arrive Tokyo', startTime: new Date('2026-03-17T12:50:00+09:00'), location: 'Tokyo Haneda T3 (HND)', category: 'flight', dayId: dayByDate.get('2026-03-17').id, cityId: cityByName.get('Tokyo').id },
      { title: 'Check-in + explore', startTime: new Date('2026-03-18T09:30:00+09:00'), location: 'Shinjuku', category: 'travel', dayId: dayByDate.get('2026-03-18').id, cityId: cityByName.get('Tokyo').id },
      { title: 'Omoide Yokocho lunch crawl', startTime: new Date('2026-03-18T12:30:00+09:00'), location: 'Omoide Yokocho', category: 'food', dayId: dayByDate.get('2026-03-18').id, cityId: cityByName.get('Tokyo').id },
      { title: 'Tokyo Met Gov sunset', startTime: new Date('2026-03-18T16:45:00+09:00'), location: 'Nishi-Shinjuku', category: 'view', dayId: dayByDate.get('2026-03-18').id, cityId: cityByName.get('Tokyo').id },
      { title: 'JR Chuo to Mitaka', startTime: new Date('2026-03-19T08:00:00+09:00'), location: 'Mitaka', category: 'train', dayId: dayByDate.get('2026-03-19').id, cityId: cityByName.get('Tokyo').id },
      { title: 'Ghibli Museum entry', startTime: new Date('2026-03-19T10:00:00+09:00'), location: 'Mitaka', category: 'culture', dayId: dayByDate.get('2026-03-19').id, cityId: cityByName.get('Tokyo').id },
      { title: 'Harmonica Yokocho dinner', startTime: new Date('2026-03-19T18:30:00+09:00'), location: 'Kichijoji', category: 'food', dayId: dayByDate.get('2026-03-19').id, cityId: cityByName.get('Tokyo').id },
      { title: 'Shinkansen to Kyoto', startTime: new Date('2026-03-31T10:00:00+09:00'), location: 'Tokyo Station', category: 'train', dayId: dayByDate.get('2026-03-31').id, cityId: cityByName.get('Kyoto').id },
      { title: 'Gion evening stroll', startTime: new Date('2026-03-31T18:30:00+09:00'), location: 'Gion', category: 'culture', dayId: dayByDate.get('2026-03-31').id, cityId: cityByName.get('Kyoto').id },
      { title: 'Fushimi Inari morning', startTime: new Date('2026-04-01T07:30:00+09:00'), location: 'Fushimi Inari', category: 'culture', dayId: dayByDate.get('2026-04-01').id, cityId: cityByName.get('Kyoto').id },
      { title: 'Travel to Osaka', startTime: new Date('2026-04-03T09:00:00+09:00'), location: 'Kyoto Station', category: 'train', dayId: dayByDate.get('2026-04-03').id, cityId: cityByName.get('Osaka').id },
      { title: 'Dotonbori food crawl', startTime: new Date('2026-04-03T19:00:00+09:00'), location: 'Dotonbori', category: 'food', dayId: dayByDate.get('2026-04-03').id, cityId: cityByName.get('Osaka').id },
      { title: 'Depart Osaka → BCN', startTime: new Date('2026-04-05T12:00:00+09:00'), location: 'KIX', category: 'flight', dayId: dayByDate.get('2026-04-05').id, cityId: cityByName.get('Osaka').id },
    ],
  });

  await prisma.checklistItem.createMany({
    data: [
      { title: 'JR Pass activated', done: false, category: 'transport', tripId: trip.id },
      { title: 'eSIM QR saved offline', done: true, category: 'connectivity', tripId: trip.id },
      { title: 'Suica loaded with ¥5000', done: false, category: 'payments', tripId: trip.id },
    ],
  });

  await prisma.expense.createMany({
    data: [
      { amount: '5000', currency: 'JPY', category: 'transport', note: 'Suica top up', tripId: trip.id },
      { amount: '6000', currency: 'JPY', category: 'tickets', note: 'Ghibli tickets', tripId: trip.id },
    ],
  });

  await prisma.booking.createMany({
    data: [
      {
        title: 'CA846 Barcelona → Beijing',
        type: 'flight',
        dateTime: new Date('2026-03-16T11:25:00+01:00'),
        location: 'Barcelona T1 (BCN)',
        confirmationCode: 'CA846-BCN',
        note: 'Arrive PEK 05:30 (+08)',
        tripId: trip.id,
        cityId: cityByName.get('Barcelona').id,
      },
      {
        title: 'CA181 Beijing → Tokyo',
        type: 'flight',
        dateTime: new Date('2026-03-17T08:45:00+08:00'),
        location: 'Beijing Capital T3 (PEK)',
        confirmationCode: 'CA181-PEK',
        note: 'Arrive HND 12:50 (+09)',
        tripId: trip.id,
        cityId: cityByName.get('Beijing').id,
      },
      {
        title: 'CA168 Tokyo → Beijing',
        type: 'flight',
        dateTime: new Date('2026-03-31T19:20:00+09:00'),
        location: 'Tokyo Haneda T3 (HND)',
        confirmationCode: 'CA168-HND',
        note: 'Arrive PEK 22:20 (+08)',
        tripId: trip.id,
        cityId: cityByName.get('Tokyo').id,
      },
      {
        title: 'CA845 Beijing → Barcelona',
        type: 'flight',
        dateTime: new Date('2026-04-01T02:50:00+08:00'),
        location: 'Beijing Capital T3 (PEK)',
        confirmationCode: 'CA845-PEK',
        note: 'Arrive BCN 08:35 (+02)',
        tripId: trip.id,
        cityId: cityByName.get('Beijing').id,
      },
    ],
  });

  await prisma.idea.createMany({
    data: [
      {
        title: 'Yakitori alley in Omoide Yokocho',
        note: 'Late night, cash friendly',
        link: 'https://goo.gl/maps/omoide',
        category: 'food',
        tripId: trip.id,
        cityId: cityByName.get('Tokyo').id,
        position: 1,
      },
      {
        title: 'TeamLab Planets',
        note: 'Reserve ahead, morning slot best',
        link: 'https://planets.teamlab.art',
        category: 'culture',
        tripId: trip.id,
        cityId: cityByName.get('Tokyo').id,
        position: 2,
      },
      {
        title: 'Hōkan-ji (Yasaka Pagoda)',
        note: 'Iconic pagoda in Kyoto, best at dusk',
        link: 'https://maps.app.goo.gl/QnZ1w2kYEh5wWBxw8',
        category: 'culture',
        tripId: trip.id,
        cityId: cityByName.get('Kyoto').id,
        position: 3,
      },
    ],
  });

  console.log('Seeded trip:', trip.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
