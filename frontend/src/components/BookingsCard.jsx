import React from 'react';
import { Box, Button, Card, CardBody, CardHeader, Divider, Flex, Heading, Stack, Tag, Text } from '@chakra-ui/react';
import { format } from 'date-fns';

function formatDateTime(value) {
  if (!value) return 'Anytime';
  const date = new Date(value);
  return `${format(date, 'EEE dd MMM HH:mm')}`;
}

const BookingItem = ({ booking, onDelete }) => (
  <Box
    p={3}
    borderRadius="12px"
    bg="whiteAlpha.100"
    border="1px solid rgba(255,255,255,0.08)"
    display="grid"
    gap={1}
  >
    <Flex justify="space-between" align="center">
      <Heading size="sm">{booking.title}</Heading>
      {booking.type && (
        <Tag size="sm" colorScheme="indigo" variant="subtle">
          {booking.type}
        </Tag>
      )}
    </Flex>
    <Text color="whiteAlpha.700" fontSize="sm">
      {formatDateTime(booking.dateTime)} · {booking.location || 'TBD'}
    </Text>
    {booking.confirmationCode && (
      <Text color="whiteAlpha.700" fontSize="sm">
        Conf: {booking.confirmationCode}
      </Text>
    )}
    {booking.link && (
      <Text color="indigo.200" fontSize="sm" as="a" href={booking.link} target="_blank" rel="noreferrer">
        Open link
      </Text>
    )}
    {booking.note && (
      <Text color="whiteAlpha.700" fontSize="sm">
        {booking.note}
      </Text>
    )}
    {onDelete && (
      <Button size="xs" variant="ghost" alignSelf="flex-start" onClick={() => onDelete(booking.id)}>
        Delete
      </Button>
    )}
  </Box>
);

const BookingsCard = ({ bookings, onAddClick, onDelete }) => (
  <Card bg="#0f1828" color="whiteAlpha.900" border="1px solid rgba(255,255,255,0.12)">
    <CardHeader pb={2}>
      <Flex justify="space-between" align="center">
        <Box>
          <Heading size="md" color="white">Bookings</Heading>
          <Text color="whiteAlpha.700" fontSize="sm">
            Flights, hotels, trains, tickets.
          </Text>
        </Box>
        <Button variant="ghost" color="white" onClick={onAddClick} _hover={{ bg: 'whiteAlpha.200' }}>
          + Add
        </Button>
      </Flex>
    </CardHeader>
    <CardBody>
      <Stack spacing={3}>
        {(bookings || []).map((booking) => (
          <BookingItem key={booking.id} booking={booking} onDelete={onDelete} />
        ))}
        {(!bookings || bookings.length === 0) && (
          <Text color="whiteAlpha.700" fontSize="sm">
            No bookings yet.
          </Text>
        )}
      </Stack>
      <Divider my={4} borderColor="whiteAlpha.200" />
      <Text color="whiteAlpha.700" fontSize="sm">
        Attach confirmations so you have PNRs and check-in times on hand.
      </Text>
    </CardBody>
  </Card>
);

export default BookingsCard;
