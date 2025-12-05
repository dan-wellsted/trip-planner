import React from 'react';
import { Box, Button, Card, CardBody, CardHeader, Divider, Flex, Heading, HStack, Stack, Tag, Text } from '@chakra-ui/react';
import { format } from 'date-fns';

const PlaceCard = ({ place, cityLabel, onPromote, onEdit, onDelete }) => (
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
        {place.tag && (
          <Tag size="sm" colorScheme="brand" variant="subtle">
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

const PlacesBoard = ({ places, cities, cityFilter, tagFilter, onFilterChange, onAddClick, onPromote, onEdit, onDelete }) => {
  const filtered = (places || []).filter((p) => {
    const cityMatch = !cityFilter || p.cityId === cityFilter;
    const tagMatch = !tagFilter || (p.tag || '').toLowerCase() === tagFilter.toLowerCase();
    return cityMatch && tagMatch;
  });

  const uniqueTags = Array.from(new Set((places || []).map((p) => p.tag).filter(Boolean)));

  return (
    <Card>
      <CardHeader pb={2}>
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size="md">Places library</Heading>
            <Text color="whiteAlpha.700" fontSize="sm">
              Saved spots to drop into your days.
            </Text>
          </Box>
          <Button variant="ghost" onClick={onAddClick}>
            + Add place
          </Button>
        </Flex>
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
        </HStack>
        <Stack spacing={3}>
          {filtered.map((place) => {
            const city = cities.find((c) => c.id === place.cityId);
            return (
              <PlaceCard
                key={place.id}
                place={place}
                cityLabel={city?.name}
                onPromote={() => onPromote(place)}
                onEdit={() => onEdit(place)}
                onDelete={() => onDelete(place.id)}
              />
            );
          })}
          {filtered.length === 0 && (
            <Box p={3} borderRadius="12px" bg="whiteAlpha.100" border="1px solid rgba(255,255,255,0.08)">
              <Text color="whiteAlpha.800">No places yet. Add a favorite spot.</Text>
            </Box>
          )}
        </Stack>
        <Divider my={4} borderColor="whiteAlpha.200" />
        <Text color="whiteAlpha.700" fontSize="sm">
          Save restaurants, sights, cafes, shops, and add them to days when you’re ready.
        </Text>
      </CardBody>
    </Card>
  );
};

export default PlacesBoard;
