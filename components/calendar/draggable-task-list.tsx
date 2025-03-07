"use client"

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Todo } from '@/types/todo'
import { DraggableTask } from './draggable-task'

interface DraggableTaskListProps {
  tasks: Todo[]
  onDragEnd: (result: any) => void
}

export function DraggableTaskList({ tasks, onDragEnd }: DraggableTaskListProps) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="tasks">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-2"
          >
            {tasks.map((task, index) => (
              <Draggable
                key={task.id}
                draggableId={task.id}
                index={index}
              >
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <DraggableTask task={task} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
} 