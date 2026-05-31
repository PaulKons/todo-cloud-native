import TaskItem from "./TaskItem";

export default function TaskList({ tasks, loading, onToggle, onDelete, onEdit }) {
  if (loading) return <p className="text-slate-600">Loading…</p>;

  if (!tasks || tasks.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-slate-600 shadow-sm">
        No tasks in this view.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {tasks.map((t) => (
        <TaskItem key={t._id} task={t} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit}/>
      ))}
    </div>
  );
}
