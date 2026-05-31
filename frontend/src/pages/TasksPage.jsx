import { useEffect, useMemo, useState } from "react";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import Modal from "../components/Modal";


export default function TasksPage() {
  const [tasks, setTasks] = useState([]);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");

  // NEW: description/notes
  const [description, setDescription] = useState("");

  // date+time fields (as you already have)
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [remindDate, setRemindDate] = useState("");
  const [remindTime, setRemindTime] = useState("");

  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    dueTime: "",
    remindDate: "",
    remindTime: "",
  });
  const [editError, setEditError] = useState("");

  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

    // Convert ISO date string -> { date:"YYYY-MM-DD", time:"HH:MM" } for inputs
  function splitISO(iso) {
    if (!iso) return { date: "", time: "" };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: "", time: "" };

    // Use local time for the inputs
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return { date, time };
  }
  function toISO(date, time) {
    if (!date) return null;
    const t = time && /^\d{2}:\d{2}$/.test(time) ? time : "00:00";
    const d = new Date(`${date}T${t}`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  async function loadTasks() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load tasks (${res.status})`);
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      setError(e.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function addTask(e) {
    e.preventDefault();
    setError("");

    const trimmed = title.trim();
    if (!trimmed) return setError("Title is required");

    const dueAt = toISO(dueDate, dueTime);
    const remindAt = toISO(remindDate, remindTime);
 // If user selected date but somehow it became invalid
  if ((dueDate && !dueAt) || (remindDate && !remindAt)) {
      return setError("Please select valid date/time values.");
    }

    // ✅ NEW VALIDATION (INSERT HERE)
    const now = new Date();

    // Due date cannot be in the past
    if (dueAt && new Date(dueAt) < now) {
      return setError("Due date/time must be in the future.");
    }

    // Reminder cannot be in the past
    if (remindAt && new Date(remindAt) < now) {
      return setError("Remind date/time must be in the future.");
    }

    // Reminder should be before due date (optional but logical)
    if (dueAt && remindAt && new Date(remindAt) > new Date(dueAt)) {
      return setError("Reminder must be before the due date.");
    }
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          description: description.trim() || null,
          priority,
          dueAt,
          remindAt,
        }),
      });

      if (!res.ok) throw new Error("Create failed");
      const created = await res.json();
      setTasks((prev) => [created, ...prev]);

      // reset
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate(""); setDueTime("");
      setRemindDate(""); setRemindTime("");
    } catch (e) {
      setError(e.message || "Create failed");
    }
  }

  async function toggleCompleted(task) {
    setError("");
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json();
      setTasks((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
    } catch {
      setError("Failed to update");
    }
  }
  
  async function deleteTask(taskId) {
    setError("");
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setTasks((prev) => prev.filter((x) => x._id !== taskId));
    } catch {
      setError("Failed to delete");
    }
  }
  async function openEdit(task) {
    setEditError("");
    setEditingTask(task);

    const due = splitISO(taskId.dueAt);
    const rem = splitISO(taskId.remindAt);

    setEditForm({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "medium",
      dueDate: due.date,
      dueTime: due.time,
      remindDate: rem.date,
      remindTime: rem.time,
    });
    //console.log("editing task:", task);

  }
  async function saveEdit(e) {
    e.preventDefault();
    setEditError("");

    if (!editingTask) return;

    const title = editForm.title.trim();
    if (!title) return setEditError("Title cannot be empty");

    const dueAt = toISO(editForm.dueDate, editForm.dueTime);
    const remindAt = toISO(editForm.remindDate, editForm.remindTime);

    // Frontend validation (same rules as create)
    const now = new Date();
    if (dueAt && new Date(dueAt) < now) return setEditError("Due date/time must be in the future.");
    if (remindAt && new Date(remindAt) < now) return setEditError("Remind date/time must be in the future.");
    if (dueAt && remindAt && new Date(remindAt) > new Date(dueAt))
      return setEditError("Reminder must be before the due date.");

    try {
      const res = await fetch(`/api/tasks/${editingTask._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          description: editForm.description,
          priority: editForm.priority,
          dueAt,
          remindAt,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Update failed (${res.status})`);

      // Update UI list instantly
      setTasks((prev) => prev.map((t) => (t._id === data._id ? data : t)));

      // Close modal
      setEditingTask(null);
    } catch (err) {
      setEditError(err.message || "Update failed");
    }
  }


  useEffect(() => {
  function onTasksChanged() {
    loadTasks();
  }
  window.addEventListener("tasks-changed", onTasksChanged);
  return () => window.removeEventListener("tasks-changed", onTasksChanged);
}, []);

  const visibleTasks = useMemo(() => {
    if (filter === "active") return tasks.filter((t) => !t.completed);
    if (filter === "completed") return tasks.filter((t) => t.completed);
    return tasks;
  
  }, [tasks, filter]);

  return (
    <div className="space-y-5">
      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {["all", "active", "completed"].map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1 text-sm capitalize ${
              filter === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {k}
          </button>
        ))}
        
      </div>
      <Modal
        open={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        title="Edit reminder"
      >
        <form onSubmit={saveEdit} className="space-y-3">
          <div>
            <label className="text-sm font-semibold">Title</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={editForm.title}
              onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Description</label>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2"
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Priority</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={editForm.priority}
              onChange={(e) => setEditForm((p) => ({ ...p, priority: e.target.value }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Due date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={editForm.dueDate}
                onChange={(e) => setEditForm((p) => ({ ...p, dueDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Due time</label>
              <input
                type="time"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={editForm.dueTime}
                onChange={(e) => setEditForm((p) => ({ ...p, dueTime: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Remind date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={editForm.remindDate}
                onChange={(e) => setEditForm((p) => ({ ...p, remindDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Remind time</label>
              <input
                type="time"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={editForm.remindTime}
                onChange={(e) => setEditForm((p) => ({ ...p, remindTime: e.target.value }))}
              />
            </div>
          </div>

          {editError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {editError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingTask(null)}
              className="rounded-xl bg-slate-100 px-4 py-2 hover:bg-slate-200"
            >
              Cancel
            </button>

            <button className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800">
              Save changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Form */}
      <TaskForm
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        priority={priority}
        setPriority={setPriority}
        dueDate={dueDate}
        setDueDate={setDueDate}
        dueTime={dueTime}
        setDueTime={setDueTime}
        remindDate={remindDate}
        setRemindDate={setRemindDate}
        remindTime={remindTime}
        setRemindTime={setRemindTime}
        onSubmit={addTask}
        error={error}
      />

      {/* List */}
      <TaskList tasks={visibleTasks} loading={loading} onToggle={toggleCompleted} onDelete={deleteTask} onEdit={openEdit}/>
    </div>
  );
}
