import React, { useMemo, useState } from 'react';
import { Box, Button, Divider, Flex, Heading, Stack, Tag, Text } from '@chakra-ui/react';
import { format } from 'date-fns';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function formatCreated(value) {
  if (!value) return '';
  const date = new Date(value);
  return format(date, 'dd MMM');
}

const IdeaItem = ({ idea, onPromote, onDelete, onEdit, dragging = false, cityLabel, cityColor }) => (
  <Box
    p={3}
    borderRadius="12px"
    bg="#0f1828"
    border="1px solid rgba(255,255,255,0.12)"
    display="grid"
    gap={1}
    opacity={dragging ? 0.8 : 1}
    boxShadow={dragging ? '0 10px 30px rgba(0,0,0,0.4)' : 'none'}
  >
    <Flex justify="space-between" align="center">
      <Heading size="sm" color="white">
        {idea.title}
      </Heading>
      <Flex gap={2} align="center">
        {cityLabel && (
          <Tag size="sm" bg={cityColor || 'whiteAlpha.300'} color={cityColor ? '#0c0c0c' : 'white'}>
            {cityLabel}
          </Tag>
        )}
        {idea.category && (
          <Tag size="sm" colorScheme="brand" variant="subtle">
            {idea.category}
          </Tag>
        )}
        <Tag size="sm" colorScheme={idea.status === 'promoted' ? 'green' : 'indigo'} variant="subtle">
          {idea.status || 'open'}
        </Tag>
      </Flex>
    </Flex>
    {idea.link && (
      <Text as="a" href={idea.link} target="_blank" rel="noreferrer" color="indigo.200" fontSize="sm">
        Link
      </Text>
    )}
    {idea.note && (
      <Text color="whiteAlpha.800" fontSize="sm">
        {idea.note}
      </Text>
    )}
    <Text color="whiteAlpha.600" fontSize="xs">
      Added {formatCreated(idea.createdAt || idea.updatedAt)}
    </Text>
    <Flex gap={2} mt={1}>
      <Button size="xs" variant="ghost" onClick={onEdit} color="whiteAlpha.900">
        Edit
      </Button>
      {idea.status !== 'promoted' && (
        <Button size="xs" variant="ghost" onClick={onPromote} color="whiteAlpha.900">
          Promote to activity
        </Button>
      )}
      <Button size="xs" variant="ghost" onClick={onDelete} color="whiteAlpha.900">
        Delete
      </Button>
    </Flex>
  </Box>
);

const SortableIdea = ({ idea, onPromote, onDelete, onEdit, cityLabel, cityColor }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: idea.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: '100%',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <IdeaItem
        idea={idea}
        onPromote={onPromote}
        onDelete={onDelete}
        onEdit={onEdit}
        dragging={isDragging}
        cityLabel={cityLabel}
        cityColor={cityColor}
      />
    </div>
  );
};

const IdeasBoard = ({ ideas, onAddClick, onPromote, onDelete, onReorder, cities = [], cityFilter, onFilterChange }) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeId, setActiveId] = useState(null);
  const activeIdea = useMemo(() => (ideas || []).find((i) => i.id === activeId), [activeId, ideas]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id || !onReorder) return;
    onReorder(active.id, over.id);
  };

  return (
    <Box bg="white" color="gray.900" borderRadius="16px" p={{ base: 3, md: 4 }} boxShadow="xl" border="1px solid rgba(0,0,0,0.05)">
      <Flex justify="space-between" align="center" mb={2}>
        <Box>
          <Heading size="lg" color="gray.800">
            Ideas board
          </Heading>
          <Text color="gray.600" fontSize="sm">
            Wishlist items you can promote to the plan.
          </Text>
        </Box>
        <Button onClick={onAddClick} variant="solid" bg="indigo.600" color="white" _hover={{ bg: 'indigo.500' }}>
          + Add idea
        </Button>
      </Flex>
      <Flex gap={2} wrap="wrap" mb={3}>
        <Button
          size="sm"
          variant={!cityFilter ? 'solid' : 'ghost'}
          bg={!cityFilter ? 'whiteAlpha.300' : 'whiteAlpha.200'}
          color={!cityFilter ? '#0c0c0c' : 'gray.800'}
          onClick={() => onFilterChange && onFilterChange(null)}
        >
          All cities
        </Button>
        {cities.map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant={cityFilter === c.id ? 'solid' : 'ghost'}
            bg={cityFilter === c.id ? 'indigo.500' : 'whiteAlpha.200'}
            color={cityFilter === c.id ? '#0c0c0c' : 'gray.800'}
            onClick={() => onFilterChange && onFilterChange(cityFilter === c.id ? null : c.id)}
          >
            {c.name}
          </Button>
        ))}
      </Flex>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={(ideas || []).map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <Stack spacing={3}>
            {(ideas || [])
              .filter((idea) => !cityFilter || idea.cityId === cityFilter)
              .map((idea) => {
                const city = cities.find((c) => c.id === idea.cityId);
                return (
                  <SortableIdea
                    key={idea.id}
                    idea={idea}
                    onPromote={() => onPromote(idea)}
                    onDelete={() => onDelete(idea.id)}
                    onEdit={() => onAddClick(idea)}
                    cityLabel={city?.name}
                    cityColor={undefined}
                  />
                );
              })}
            {(!ideas || ideas.length === 0) && (
              <Box p={3} borderRadius="12px" bg="#0f1828" border="1px solid rgba(255,255,255,0.12)" color="whiteAlpha.900">
                <Text>No ideas yet. Add restaurants, sights, or links here.</Text>
              </Box>
            )}
          </Stack>
        </SortableContext>
        <DragOverlay>
          {activeIdea ? (
            <IdeaItem idea={activeIdea} onPromote={() => {}} onDelete={() => {}} onEdit={() => {}} dragging />
          ) : null}
        </DragOverlay>
      </DndContext>
      <Divider my={4} borderColor="blackAlpha.200" />
      <Text color="gray.600" fontSize="sm">
        Drop places or links, then move them into days when decided.
      </Text>
    </Box>
  );
};

export default IdeasBoard;
