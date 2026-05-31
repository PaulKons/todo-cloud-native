export default function TaskItem({ task, onToggle, onDelete, onEdit }) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl border bg-white p-4 shadow-sm ${
        task.completed ? "opacity-75" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Force checkbox to be visible and clickable */}
        <input
          type="checkbox"
          checked={Boolean(task.completed)}
          readOnly
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task);
          }}
          className="h-5 w-5 accent-slate-900 cursor-pointer"
        />

        <div>
          <div
            className={`font-semibold ${
              task.completed ? "line-through text-slate-500" : "text-slate-900"
            }`}
          >
            {/* If title is missing, show a fallback so you notice it */}
            {task.title ?? "(missing title)"}
          </div>
          {/* Description preview (NEW) */}
            {task.description && task.description.trim() !== "" && (
              <div className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">
                {task.description}
              </div>
            )}

          <div className="text-sm text-slate-500">
            priority: {task.priority ?? "medium"}
            {task.dueAt && (
                <div className="text-sm text-slate-500">
                    due: {new Date(task.dueAt).toLocaleString()}
                </div>
                )}

                {task.remindAt && (
                <div className="text-sm text-slate-500">
                    remind: {new Date(task.remindAt).toLocaleString()}
                </div>
                )}

          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          className="rounded-xl bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200"
        >
          Edit
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task._id);
          }}
          className="rounded-xl bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200"
        >
          Delete
        </button>
    </div>
    
      
      
    </div>
  );
}
