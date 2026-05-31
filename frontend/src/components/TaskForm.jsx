// TaskForm is responsible ONLY for the form UI.
// It does not store tasks. It just collects user input.
// "YYYY-MM-DD" for min date
const todayStr = new Date().toISOString().slice(0, 10);

// "HH:MM" for min time (24h, zero padded)
const now = new Date();
const nowTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
  now.getMinutes()
).padStart(2, "0")}`;

export default function TaskForm({
  title, setTitle,
  description, setDescription,
  priority, setPriority,
  dueDate, setDueDate,
  dueTime, setDueTime,
  remindDate, setRemindDate,
  remindTime, setRemindTime,
  onSubmit,
  error,
}) {

  return (
    // Form wrapper card
<form onSubmit={onSubmit} className="rounded-2xl border bg-white p-4 shadow-sm">
  {/* Row 1 */}
  <div className="grid gap-3 sm:grid-cols-12">
    <div className="sm:col-span-9">
      <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
      />
    </div>
    <div className="sm:col-span-12">
  <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
  <textarea
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    placeholder="Optional notes for this task..."
    rows={3}
    className="w-full resize-none rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
    />
    </div>


    <div className="sm:col-span-3">
      <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="w-full rounded-xl border px-3 py-2"
      >
        <option value="low">low</option>
        <option value="medium">medium</option>
        <option value="high">high</option>
      </select>
    </div>
  </div>

  {/* Row 2 */}
  <div className="mt-4 grid gap-3 sm:grid-cols-12">
    <div className="sm:col-span-3">
      <label className="mb-1 block text-sm font-medium text-slate-700">Due date</label>
      <input
        type="date" min={todayStr}
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="w-full min-w-[170px] rounded-xl border px-3 py-2"
      />
    </div>

    <div className="sm:col-span-3">
      <label className="mb-1 block text-sm font-medium text-slate-700">Due time</label>
      <input
        type="time"min={dueDate === todayStr ? nowTimeStr : undefined}
        value={dueTime}
        onChange={(e) => setDueTime(e.target.value)}
        className="w-full min-w-[130px] rounded-xl border px-3 py-2"
      />
    </div>

    <div className="sm:col-span-3">
      <label className="mb-1 block text-sm font-medium text-slate-700">Remind date</label>
      <input
        type="date"
        value={remindDate} min={remindDate === todayStr ? nowTimeStr : undefined}
        onChange={(e) => setRemindDate(e.target.value)}
        className="w-full min-w-[170px] rounded-xl border px-3 py-2"
      />
    </div>

    <div className="sm:col-span-3">
      <label className="mb-1 block text-sm font-medium text-slate-700">Remind time</label>
      <input
        type="time"
        value={remindTime}
        onChange={(e) => setRemindTime(e.target.value)}
        className="w-full min-w-[130px] rounded-xl border px-3 py-2"
      />
    </div>
  </div>

  <button
    type="submit"
    className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800"
  >
    Add task
  </button>
  

  {error && (
    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {error}
    </div>
  )}
</form>

  );
}
