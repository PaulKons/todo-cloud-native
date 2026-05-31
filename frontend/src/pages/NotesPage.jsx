import { useEffect, useState } from "react";
import Modal from "../components/Modal";

export default function NotesPage() {
  const [text, setText] = useState("");
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState(null);  // Which note is being edited right now (null = modal closed)
  const [editText, setEditText] = useState(""); // Form field for editing
  const [editError, setEditError] = useState(""); // Error message for edit
  const [uploadingNoteId, setUploadingNoteId] = useState(null);

  async function loadNotes() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/notes", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load notes");
      const data = await res.json();
      setNotes(data);
    } catch (e) {
      setError(e.message || "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotes();
  }, []);

  async function addNote(e) {
    e.preventDefault();
    setError("");

    const t = text.trim();
    if (!t) return setError("Note text is required");

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Create failed (${res.status})`);
      }
      const created = await res.json();
      setNotes((prev) => [created, ...prev]);
      setText("");
    } catch (e) {
      setError(e.message || "Create failed");
    }
  }

  async function deleteNote(id) {
    setError("");
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setNotes((prev) => prev.filter((n) => n._id !== id));
    } catch (e) {
      setError(e.message || "Delete failed");
    }
  }

  function openEditNote(note) {
    setEditError("");
    setEditingNote(note);
    setEditText(note.text || "");
  }
  async function saveEditNote(e) {
    //const data = await res.json().catch(() => ({}));
    //if (!res.ok) throw new Error(data.message || `Update failed (${res.status})`);

    e.preventDefault();
    setEditError("");

    if (!editingNote?._id) {
      setEditError("Internal error: missing note id.");
      return;
    }

    const trimmed = editText.trim();
    if (!trimmed) {
      setEditError("Note cannot be empty.");
      return;
    }
    console.log("editingNote is:", editingNote);
    console.log("PATCH URL will be:", `/api/notes/${editingNote?._id}`);
    try {
      const res = await fetch(`/api/notes/${editingNote._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: trimmed }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Update failed (${res.status})`);

    // Update UI immediately
    setNotes((prev) => prev.map((n) => (n._id === data._id ? data : n)));

    // Close modal
    setEditingNote(null);
  } catch (err) {
    setEditError(err.message || "Update failed");
  }
}

async function uploadAttachment(noteId, file) {
  if (!file) return;

  setError("");
  setUploadingNoteId(noteId);

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/notes/${noteId}/attachments`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || `Upload failed (${res.status})`);
    }

    await loadNotes();
  } catch (e) {
    setError(e.message || "Upload failed");
  } finally {
    setUploadingNoteId(null);
  }
}

async function deleteAttachment(noteId, attachmentId) {
  setError("");

  try {
    const res = await fetch(`/api/notes/${noteId}/attachments/${attachmentId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || `Delete attachment failed (${res.status})`);
    }

    await loadNotes();
  } catch (e) {
    setError(e.message || "Delete attachment failed");
  }
}

return (
  <div className="space-y-5">
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Notes</h2>
      <p className="text-sm text-slate-500">Saved to MongoDB.</p>

      <form onSubmit={addNote} className="mt-3 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a note..."
          rows={4}
          className="w-full resize-none rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
        />

        <button className="w-full rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800">
          Add note
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>

    {loading ? (
      <p className="text-slate-600">Loading…</p>
    ) : notes.length === 0 ? (
      <div className="rounded-2xl border bg-white p-6 text-slate-600 shadow-sm">
        No notes yet.
      </div>
    ) : (
      <div className="grid gap-3">
        {notes.map((n) => (
          <div key={n._id} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">
              {new Date(n.createdAt).toLocaleString("en-GB", {
                hour12: false,
              })}
            </div>

            <div className="mt-2 whitespace-pre-wrap">{n.text}</div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => deleteNote(n._id)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm hover:bg-slate-200"
              >
                Delete
              </button>

              <button
                type="button"
                onClick={() => openEditNote(n)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm hover:bg-slate-200"
              >
                Edit
              </button>

              <label className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                {uploadingNoteId === n._id ? "Uploading..." : "Upload file"}

                <input
                  type="file"
                  className="hidden"
                  disabled={uploadingNoteId === n._id}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    uploadAttachment(n._id, file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {n.attachments?.length > 0 && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <div className="text-sm font-semibold text-slate-700">
                  Attachments
                </div>

                <div className="mt-2 space-y-2">
                  {n.attachments.map((a) => (
                    <div
                      key={a._id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">{a.originalName}</div>

                        <div className="text-xs text-slate-500">
                          {a.mimeType || "unknown type"} · {a.size || 0} bytes ·{" "}
                          {a.status || "uploaded"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteAttachment(n._id, a._id)}
                        className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Delete file
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          ))}
        </div>
      )}

    <Modal
      open={Boolean(editingNote)}
      onClose={() => setEditingNote(null)}
      title="Edit note"
    >
      <form onSubmit={saveEditNote} className="space-y-3">
        <div>
          <label className="text-sm font-semibold">Text</label>

          <textarea
            className="mt-1 w-full rounded-xl border px-3 py-2"
            rows={6}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
          />
        </div>

        {editError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {editError}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditingNote(null)}
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
  </div>
)}