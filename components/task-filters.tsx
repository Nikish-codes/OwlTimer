import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import type { TaskFilters as TaskFiltersType } from "@/lib/task-filters"
import type { Todo } from "@/types/todo"

interface TaskFiltersProps {
  tasks: Todo[]
  filters: TaskFiltersType
  onFiltersChange: (filters: TaskFiltersType) => void
}

export function TaskFilters({ tasks, filters, onFiltersChange }: TaskFiltersProps) {
  const uniqueSubjects = Array.from(new Set(tasks.map(task => task.subject).filter(Boolean)))
  const priorities: Todo["priority"][] = ["low", "medium", "high"]

  return (
    <div className="space-y-4 my-4">
      <Input
        placeholder="Search tasks..."
        value={filters.search}
        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
      />
      
      <div className="flex gap-2 flex-wrap">
        {priorities.map(priority => (
          <Badge
            key={priority}
            variant={filters.priorities.includes(priority) ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => {
              const newPriorities = filters.priorities.includes(priority)
                ? filters.priorities.filter(p => p !== priority)
                : [...filters.priorities, priority]
              onFiltersChange({ ...filters, priorities: newPriorities })
            }}
          >
            {priority}
          </Badge>
        ))}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="show-completed"
          checked={filters.showCompleted}
          onCheckedChange={(checked) => 
            onFiltersChange({ ...filters, showCompleted: checked as boolean })
          }
        />
        <label htmlFor="show-completed">Show completed tasks</label>
      </div>
    </div>
  )
} 