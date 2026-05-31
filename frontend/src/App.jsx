import { useEffect, useMemo, useState } from "react";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";

export default function App() {
  const [tasks, setTasks] = useState([]);
  // form state
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");

  const [remindDate, setRemindDate] = useState("");
  const [remindTime, setRemindTime] = useState("");


  // UI state
  const [filter, setFilter] = useState("all"); // all | active | completed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    function toISO(date, time) {
      if (!date) return null;

      // time must be "HH:MM" (24h). If missing, default.
      const t = time && /^\d{2}:\d{2}$/.test(time) ? time : "00:00";

      const d = new Date(`${date}T${t}`);
      if (Number.isNaN(d.getTime())) return null;

      return d.toISOString();
    }


    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          description: description.trim() || "",
          priority,
          dueAt: toISO(dueDate, dueTime),
          remindAt: toISO(remindDate, remindTime),
        }),


      });
      if (!res.ok) throw new Error("Create failed");

      const created = await res.json();
      setTasks((prev) => [created, ...prev]);

      setTitle("");
      setPriority("medium");
    } catch (e) {
      setError(e.message || "Failed to create task");
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
    } catch (e) {
      setError(e.message || "Failed to update");
    }
  }

  async function deleteTask(taskId) {
    setError("");
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      setTasks((prev) => prev.filter((x) => x._id !== taskId));
    } catch (e) {
      setError(e.message || "Failed to delete");
    }
  }

  // Filtered view (this is what the buttons control)
  const visibleTasks = useMemo(() => {
    if (filter === "active") return tasks.filter((t) => !t.completed);
    if (filter === "completed") return tasks.filter((t) => t.completed);
    return tasks;
  }, [tasks, filter]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notebook</h1>
            <p className="text-sm text-slate-500">Tasks</p>
          </div>

          <div className="flex items-center gap-2">
            {["all", "active", "completed"].map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-full px-3 py-1 text-sm capitalize ${
                  filter === k
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-5">
        {/* Important: TaskForm rendered ONCE */}
        <TaskForm
          title={title}
          setTitle={setTitle}
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

        {/* Important: pass visibleTasks so filters work */}
        <TaskList
          tasks={visibleTasks}
          loading={loading}
          onToggle={toggleCompleted}
          onDelete={deleteTask}
        />
      </main>
    </div>
  );
}
