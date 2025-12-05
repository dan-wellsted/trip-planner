import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Flex,
  Heading,
  HStack,
  Input,
  Select,
  Stack,
  Tag,
  Text,
  VStack,
} from '@chakra-ui/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Supercluster from 'supercluster';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const StarIcon = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'gold' : 'none'} stroke={filled ? 'gold' : 'currentColor'}>
    <path
      d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L12 16.9l-5.2 2.6.99-5.78-4.21-4.1 5.82-.85z"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

const PlaceCard = ({ place, cityLabel, onPromote, onEdit, onDelete, onToggleFavorite, isFavorite }) => (
  <Box
    p={3}
    borderRadius="12px"
    bg="#0f1828"
    border="1px solid rgba(255,255,255,0.12)"
    display="grid"
    gap={1}
  >
    <Flex justify="space-between" align="center">
      <Heading size="sm" color="white">
        {place.name}
      </Heading>
      <HStack gap={1}>
        <Button
          size="xs"
          variant="ghost"
          onClick={onToggleFavorite}
          aria-label={isFavorite ? 'Unfavorite' : 'Favorite'}
          minW="auto"
          px={2}
        >
          <StarIcon filled={isFavorite} />
        </Button>
        {place.tag && (
          <Tag size="sm" colorScheme="brand" variant="solid" color="white">
            {place.tag}
          </Tag>
        )}
        {cityLabel && (
          <Tag size="sm" bg="whiteAlpha.300" color="white">
            {cityLabel}
          </Tag>
        )}
      </HStack>
    </Flex>
    {place.address && (
      <Text color="whiteAlpha.800" fontSize="sm">
        {place.address}
      </Text>
    )}
    {place.link && (
      <Text as="a" href={place.link} target="_blank" rel="noreferrer" color="indigo.200" fontSize="sm">
        Link
      </Text>
    )}
    {place.notes && (
      <Text color="whiteAlpha.700" fontSize="sm">
        {place.notes}
      </Text>
    )}
    <Flex gap={2} mt={2}>
      <Button size="xs" variant="ghost" onClick={onPromote} color="whiteAlpha.900">
        Add to day
      </Button>
      <Button size="xs" variant="ghost" onClick={onEdit} color="whiteAlpha.900">
        Edit
      </Button>
      <Button size="xs" variant="ghost" onClick={onDelete} color="whiteAlpha.900">
        Delete
      </Button>
    </Flex>
  </Box>
);

const sortPlaces = (items, sort, cities) => {
  const cityMap = new Map((cities || []).map((c) => [c.id, c.name || '']));
  return [...items].sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    const cityA = cityMap.get(a.cityId) || '';
    const cityB = cityMap.get(b.cityId) || '';
    const tagA = (a.tag || '').toLowerCase();
    const tagB = (b.tag || '').toLowerCase();
    if (sort === 'name') return nameA.localeCompare(nameB);
    if (sort === 'city') return cityA.localeCompare(cityB) || nameA.localeCompare(nameB);
    if (sort === 'tag') return tagA.localeCompare(tagB) || nameA.localeCompare(nameB);
    const dateA = a.createdAt || a.updatedAt || '';
    const dateB = b.createdAt || b.updatedAt || '';
    return dateA > dateB ? -1 : dateA < dateB ? 1 : nameA.localeCompare(nameB);
  });
};

const groupPlaces = (items, groupBy, cities) => {
  if (groupBy === 'city') {
    const cityMap = new Map((cities || []).map((c) => [c.id, c.name || '']));
    const buckets = new Map();
    items.forEach((p) => {
      const key = p.cityId;
      const title = cityMap.get(p.cityId) || 'Unknown city';
      if (!buckets.has(key)) buckets.set(key, { title, items: [] });
      buckets.get(key).items.push(p);
    });
    return Array.from(buckets.values());
  }
  if (groupBy === 'tag') {
    const buckets = new Map();
    items.forEach((p) => {
      const key = p.tag || 'untagged';
      const title = p.tag || 'Untagged';
      if (!buckets.has(key)) buckets.set(key, { title, items: [] });
      buckets.get(key).items.push(p);
    });
    return Array.from(buckets.values());
  }
  return [{ title: null, items }];
};

const PlacesBoard = ({
  places,
  cities,
  cityFilter,
  tagFilter,
  search,
  sort = 'newest',
  groupBy = 'none',
  view = 'list',
  favorites = [],
  favoritesOnly = false,
  onToggleFavoritesOnly,
  onToggleFavorite,
  onViewChange,
  onSearchChange,
  onSortChange,
  onGroupChange,
  onFilterChange,
  onAddClick,
  onPromote,
  onEdit,
  onDelete,
  onSaveFromLink,
  dayOptions = [],
  onQuickPromote,
}) => {
  const [linkInput, setLinkInput] = useState('');
  const [map, setMap] = useState(null);
  const [clusters, setClusters] = useState([]);
  const uniqueTags = useMemo(() => Array.from(new Set((places || []).map((p) => p.tag).filter(Boolean))), [places]);

  const filtered = useMemo(() => {
    return (places || []).filter((p) => {
      const cityMatch = !cityFilter || p.cityId === cityFilter;
      const tagMatch = !tagFilter || (p.tag || '').toLowerCase() === tagFilter.toLowerCase();
      const favoriteMatch = !favoritesOnly || favorites.includes(p.id);
      const query = (search || '').toLowerCase();
      const searchMatch =
        !query ||
        (p.name || '').toLowerCase().includes(query) ||
        (p.address || '').toLowerCase().includes(query) ||
        (p.tag || '').toLowerCase().includes(query) ||
        (p.notes || '').toLowerCase().includes(query);
      return cityMatch && tagMatch && favoriteMatch && searchMatch;
    });
  }, [places, cityFilter, tagFilter, favoritesOnly, favorites, search]);

  const sorted = useMemo(() => sortPlaces(filtered, sort, cities), [filtered, sort, cities]);
  const grouped = useMemo(() => groupPlaces(sorted, groupBy, cities), [sorted, groupBy, cities]);
  const placesWithCoords = useMemo(
    () =>
      sorted.filter(
        (p) =>
          p.lat !== null &&
          p.lat !== undefined &&
          p.lng !== null &&
          p.lng !== undefined &&
          !Number.isNaN(Number(p.lat)) &&
          !Number.isNaN(Number(p.lng))
      ),
    [sorted]
  );
  const points = useMemo(
    () =>
      placesWithCoords.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(p.lng), Number(p.lat)] },
        properties: { cluster: false, placeId: p.id },
      })),
    [placesWithCoords]
  );
  const clusterIndex = useMemo(() => {
    const index = new Supercluster({ radius: 70, maxZoom: 18 });
    index.load(points);
    return index;
  }, [points]);
  useEffect(() => {
    const globalClusters = clusterIndex.getClusters([-180, -85, 180, 85], 3);
    setClusters(globalClusters);
  }, [clusterIndex]);

  useEffect(() => {
    if (!map) return undefined;
    const update = () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const clustersForView = clusterIndex.getClusters(
        [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        Math.round(zoom)
      );
      setClusters(clustersForView);
    };
    update();
    map.on('moveend', update);
    return () => {
      map.off('moveend', update);
    };
  }, [map, clusterIndex]);
  const defaultCenter = placesWithCoords.length
    ? [Number(placesWithCoords[Math.floor(placesWithCoords.length / 2)].lat), Number(placesWithCoords[Math.floor(placesWithCoords.length / 2)].lng)]
    : [35.6762, 139.6503];
  const total = filtered.length;

  return (
    <Card bg="#0f1828" border="1px solid rgba(255,255,255,0.12)" color="whiteAlpha.900">
      <CardHeader pb={2}>
        <Stack spacing={3}>
          <Flex justify="space-between" align="center" gap={3} wrap="wrap">
            <Box>
              <Heading size="md" color="white">Places library</Heading>
              <Text color="whiteAlpha.800" fontSize="sm">
                Saved spots to drop into your days.
              </Text>
            </Box>
            <HStack>
              <Button
                variant={view === 'list' ? 'solid' : 'ghost'}
                bg={view === 'list' ? 'indigo.600' : 'whiteAlpha.200'}
                color={view === 'list' ? 'white' : 'whiteAlpha.900'}
                _hover={{ bg: view === 'list' ? 'indigo.500' : 'whiteAlpha.300' }}
                onClick={() => onViewChange && onViewChange('list')}
              >
                List view
              </Button>
              <Button
                variant={view === 'map' ? 'solid' : 'ghost'}
                bg={view === 'map' ? 'indigo.600' : 'whiteAlpha.200'}
                color={view === 'map' ? 'white' : 'whiteAlpha.900'}
                _hover={{ bg: view === 'map' ? 'indigo.500' : 'whiteAlpha.300' }}
                onClick={() => onViewChange && onViewChange('map')}
              >
                Map view
              </Button>
              <Button variant="solid" bg="brand.500" _hover={{ bg: 'brand.400' }} color="#0c0c0c" onClick={onAddClick}>
                + Add place
              </Button>
            </HStack>
          </Flex>

          <Flex gap={3} wrap="wrap">
            <Input
              placeholder="Search by name, tag, or address"
              value={search}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              maxW="260px"
              bg="whiteAlpha.100"
              color="white"
            />
            <Select
              value={sort}
              onChange={(e) => onSortChange && onSortChange(e.target.value)}
              maxW="200px"
              bg="whiteAlpha.100"
              color="white"
              borderColor="whiteAlpha.300"
            >
              <option value="newest">Newest</option>
              <option value="name">Name A–Z</option>
              <option value="city">City</option>
              <option value="tag">Tag</option>
            </Select>
            <HStack>
              <Button
                size="sm"
                variant={groupBy === 'none' ? 'solid' : 'ghost'}
                onClick={() => onGroupChange && onGroupChange('none')}
                bg={groupBy === 'none' ? 'whiteAlpha.300' : 'whiteAlpha.200'}
                color={groupBy === 'none' ? '#0c0c0c' : 'white'}
                _hover={{ bg: 'whiteAlpha.300' }}
              >
                No group
              </Button>
              <Button
                size="sm"
                variant={groupBy === 'city' ? 'solid' : 'ghost'}
                onClick={() => onGroupChange && onGroupChange('city')}
                bg={groupBy === 'city' ? 'whiteAlpha.300' : 'whiteAlpha.200'}
                color={groupBy === 'city' ? '#0c0c0c' : 'white'}
                _hover={{ bg: 'whiteAlpha.300' }}
              >
                Group by city
              </Button>
              <Button
                size="sm"
                variant={groupBy === 'tag' ? 'solid' : 'ghost'}
                onClick={() => onGroupChange && onGroupChange('tag')}
                bg={groupBy === 'tag' ? 'whiteAlpha.300' : 'whiteAlpha.200'}
                color={groupBy === 'tag' ? '#0c0c0c' : 'white'}
                _hover={{ bg: 'whiteAlpha.300' }}
              >
                Group by tag
              </Button>
            </HStack>
          </Flex>

          <Flex gap={2} wrap="wrap" align="center">
            <Input
              placeholder="Paste a map link to save"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              maxW="320px"
              bg="whiteAlpha.100"
              color="white"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!linkInput.trim()) return;
                onSaveFromLink && onSaveFromLink(linkInput.trim());
                setLinkInput('');
              }}
            >
              Save from link
            </Button>
          </Flex>
        </Stack>
      </CardHeader>
      <CardBody>
        <HStack spacing={2} wrap="wrap" mb={3}>
          <Button
            size="sm"
            variant={!cityFilter ? 'solid' : 'ghost'}
            bg={!cityFilter ? 'whiteAlpha.300' : 'whiteAlpha.200'}
            color={!cityFilter ? '#0c0c0c' : 'white'}
            onClick={() => onFilterChange({ cityId: null, tag: tagFilter })}
          >
            All cities
          </Button>
          {cities.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={cityFilter === c.id ? 'solid' : 'ghost'}
              bg={cityFilter === c.id ? 'indigo.500' : 'whiteAlpha.200'}
              color={cityFilter === c.id ? '#0c0c0c' : 'white'}
              onClick={() => onFilterChange({ cityId: cityFilter === c.id ? null : c.id, tag: tagFilter })}
            >
              {c.name}
            </Button>
          ))}
        </HStack>
        <HStack spacing={2} wrap="wrap" mb={3}>
          <Button
            size="sm"
            variant={!tagFilter ? 'solid' : 'ghost'}
            bg={!tagFilter ? 'whiteAlpha.300' : 'whiteAlpha.200'}
            color={!tagFilter ? '#0c0c0c' : 'white'}
            onClick={() => onFilterChange({ cityId: cityFilter, tag: null })}
          >
            All tags
          </Button>
          {uniqueTags.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={tagFilter === t ? 'solid' : 'ghost'}
              bg={tagFilter === t ? 'indigo.500' : 'whiteAlpha.200'}
              color={tagFilter === t ? '#0c0c0c' : 'white'}
              onClick={() => onFilterChange({ cityId: cityFilter, tag: tagFilter === t ? null : t })}
            >
              {t}
            </Button>
          ))}
          <Button
            size="sm"
            variant={favoritesOnly ? 'solid' : 'ghost'}
            bg={favoritesOnly ? 'yellow.400' : 'whiteAlpha.200'}
            color={favoritesOnly ? '#0c0c0c' : 'white'}
            onClick={() => onToggleFavoritesOnly && onToggleFavoritesOnly(!favoritesOnly)}
          >
            Favorites
          </Button>
        </HStack>
        {view === 'map' ? (
          <Box borderRadius="12px" overflow="hidden" border="1px solid rgba(255,255,255,0.12)">
            <MapContainer
              center={defaultCenter}
              zoom={5}
              style={{ height: '420px', width: '100%' }}
              scrollWheelZoom
              preferCanvas
              whenCreated={setMap}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> | Tiles &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              {(clusters.length ? clusters : placesWithCoords.map((p) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [Number(p.lng), Number(p.lat)] },
                properties: { cluster: false, placeId: p.id },
              }))).map((feature) => {
                const [lng, lat] = feature.geometry.coordinates;
                const { cluster: isCluster, point_count: pointCount, cluster_id: clusterId } = feature.properties;
                if (isCluster) {
                  const size = Math.min(40, 24 + pointCount * 0.5);
                  return (
                    <Marker
                      key={`cluster-${clusterId}`}
                      position={[lat, lng]}
                      icon={L.divIcon({
                        html: `<div style="background: rgba(90,115,255,0.9); color: white; border-radius: 999px; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; font-weight: 700;">${pointCount}</div>`,
                        className: '',
                      })}
                      eventHandlers={{
                        click: () => {
                          if (!map) return;
                          const expansionZoom = Math.min(clusterIndex.getClusterExpansionZoom(clusterId), 18);
                          map.flyTo([lat, lng], expansionZoom);
                        },
                      }}
                    />
                  );
                }
                const place = placesWithCoords.find((p) => p.id === feature.properties.placeId);
                if (!place) return null;
                return (
                  <Marker key={place.id} position={[Number(place.lat), Number(place.lng)]} icon={markerIcon}>
                    <Popup>
                      <VStack align="stretch" spacing={2}>
                        <Text fontWeight="bold">{place.name}</Text>
                        {place.address && <Text fontSize="sm">{place.address}</Text>}
                        {place.tag && (
                          <Tag size="sm" colorScheme="brand" variant="solid" w="fit-content" color="white">
                            {place.tag}
                          </Tag>
                        )}
                        <HStack>
                          <Button size="xs" onClick={() => onPromote(place)}>
                            Add to day
                          </Button>
                          <Button size="xs" variant="ghost" onClick={() => onEdit(place)}>
                            Edit
                          </Button>
                          <Button size="xs" variant="ghost" onClick={() => onToggleFavorite && onToggleFavorite(place.id)}>
                            <StarIcon filled={favorites.includes(place.id)} />
                          </Button>
                        </HStack>
                        {dayOptions.length > 0 && onQuickPromote && (
                          <HStack>
                            <Select
                              size="sm"
                              placeholder="Select day"
                              bg="white"
                              color="black"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) onQuickPromote(place, val);
                              }}
                            >
                              {dayOptions.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.label}
                                </option>
                              ))}
                            </Select>
                          </HStack>
                        )}
                      </VStack>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
            {sorted.length === 0 && (
              <Box p={3} bg="#0f1828" color="whiteAlpha.800">
                No places with coordinates to show. Add lat/lng or clear filters.
              </Box>
            )}
          </Box>
        ) : (
          <Stack spacing={4}>
            {grouped.map((bucket, idx) => (
              <Box key={`${bucket.title || 'all'}-${idx}`}>
                {bucket.title && (
                  <Heading size="sm" color="whiteAlpha.800" mb={2}>
                    {bucket.title}
                  </Heading>
                )}
                <Stack spacing={3}>
                  {bucket.items.map((place) => {
                    const city = cities.find((c) => c.id === place.cityId);
                    return (
                      <PlaceCard
                        key={place.id}
                        place={place}
                        cityLabel={city?.name}
                        onPromote={() => onPromote(place)}
                        onEdit={() => onEdit(place)}
                        onDelete={() => onDelete(place.id)}
                        onToggleFavorite={() => onToggleFavorite && onToggleFavorite(place.id)}
                        isFavorite={favorites.includes(place.id)}
                      />
                    );
                  })}
                </Stack>
              </Box>
            ))}
            {total === 0 && (
              <Box p={3} borderRadius="12px" bg="whiteAlpha.100" border="1px solid rgba(255,255,255,0.08)">
                <Text color="whiteAlpha.800">No places match these filters. Add a spot or clear the filters.</Text>
              </Box>
            )}
          </Stack>
        )}
        <Divider my={4} borderColor="whiteAlpha.200" />
        <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
          <Text color="whiteAlpha.700" fontSize="sm">
            Save restaurants, sights, cafes, shops, and add them to days when you’re ready.
          </Text>
          <Tag colorScheme="brand" variant="subtle" color="#0c0c0c">
            {total} place{total === 1 ? '' : 's'}
          </Tag>
        </Flex>
      </CardBody>
    </Card>
  );
};

export default PlacesBoard;
