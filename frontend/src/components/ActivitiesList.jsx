import React, { useMemo, useState } from 'react';
import { Box, Button, Flex, HStack, Tag, Text } from '@chakra-ui/react';
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

const ActivityItem = ({ activity, onEdit, onDelete, cityTag, durationText, travelText, dragging, overbooked }) => (
  <Box
    p={3}
    borderRadius="12px"
    bg="whiteAlpha.100"
    border={`1px solid ${overbooked ? 'rgba(255,99,132,0.6)' : 'rgba(255,255,255,0.08)'}`}
    opacity={dragging ? 0.8 : 1}
    boxShadow={dragging ? '0 10px 30px rgba(0,0,0,0.4)' : 'none'}
  >
    <Flex justify="space-between" align="center" gap={3}>
      <Box>
        <Text fontWeight="bold" color="white">
          {activity.title}
        </Text>
        <Text color="whiteAlpha.700" fontSize="sm">
          {durationText} · {activity.location || 'TBD'} · {activity.category || 'activity'}
        </Text>
        {travelText && (
          <Text color="whiteAlpha.500" fontSize="xs">
            {travelText}
          </Text>
        )}
      </Box>
      <HStack>
        {cityTag}
        <Button size="xs" variant="ghost" onClick={onEdit} color="whiteAlpha.900">
          Edit
        </Button>
        <Button size="xs" variant="ghost" onClick={onDelete} color="whiteAlpha.900">
          Delete
        </Button>
      </HStack>
    </Flex>
  </Box>
);

const SortableActivity = ({ activity, onEdit, onDelete, cityTag, durationText, travelText, overbooked }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: '100%',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ActivityItem
        activity={activity}
        onEdit={onEdit}
        onDelete={onDelete}
        cityTag={cityTag}
        durationText={durationText}
        travelText={travelText}
        dragging={isDragging}
        overbooked={overbooked}
      />
    </div>
  );
};

const formatTimeRange = (startTime, endTime) => {
  if (!startTime && !endTime) return 'Time tbd';
  const opts = { hour: '2-digit', minute: '2-digit' };
  const start = startTime ? new Date(startTime) : null;
  const end = endTime ? new Date(endTime) : null;
  if (start && end) {
    return `${start.toLocaleTimeString([], opts)} – ${end.toLocaleTimeString([], opts)}`;
  }
  if (start) return `${start.toLocaleTimeString([], opts)} start`;
  if (end) return `${end.toLocaleTimeString([], opts)} end`;
  return 'Time tbd';
};

const ActivitiesList = ({ activities, cities, onEdit, onDelete, onReorder, dayOverbooked, travelEstimate }) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeId, setActiveId] = useState(null);
  const activeActivity = useMemo(() => (activities || []).find((a) => a.id === activeId), [activeId, activities]);

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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SortableContext items={(activities || []).map((a) => a.id)} strategy={verticalListSortingStrategy}>
        {(activities || []).map((act, idx) => {
          const city = cities.find((c) => c.id === act.cityId);
          const cityTag = city ? (
            <Tag size="sm" bg="whiteAlpha.200" color="white">
              {city.name}
            </Tag>
          ) : null;
          const durationText = formatTimeRange(act.startTime, act.endTime);
          const travelMinutes = travelEstimate ? travelEstimate(idx, activities) : 0;
          const travelText = travelMinutes ? `Travel est. ${travelMinutes} min` : '';
          return (
            <SortableActivity
              key={act.id}
              activity={act}
              onEdit={() => onEdit(act)}
              onDelete={() => onDelete(act.id)}
              cityTag={cityTag}
              durationText={durationText}
              travelText={travelText}
              overbooked={dayOverbooked}
            />
          );
        })}
      </SortableContext>
      <DragOverlay>
        {activeActivity ? (
          <ActivityItem
            activity={activeActivity}
            onEdit={() => {}}
            onDelete={() => {}}
            cityTag={null}
            durationText={formatTimeRange(activeActivity.startTime, activeActivity.endTime)}
            travelText=""
            dragging
            overbooked={dayOverbooked}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default ActivitiesList;
