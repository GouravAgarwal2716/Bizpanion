import React, { useEffect, useState } from "react";
import { api } from "./api";

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // all | open | done
  const [filterPriority, setFilterPriority] = useState("all"); // all | low | medium | high
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newPriority, setNewPriority] = useState("medium");

  async function fetchTasks(status) {
    setLoading(true);
    try {
      const params = [];
      if (status && status !== "all") params.push(`status=${encodeURIComponent(status)}`);
      if (filterPriority && filterPriority !== "all") params.push(`priority=${encodeURIComponent(filterPriority)}`);
      const q = params.length ? `?${params.join("&")}` : "";
      const res = await api.get(`/tasks${q}`);
      setTasks(res.data || []);
    } catch (e) {
      console.error("Failed to fetch tasks", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks(filter === "all" ? "" : filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, filterPriority]);

  async function addTask(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await api.post("/tasks", {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        source: "manual",
        dueDate: newDue || null,
        priority: newPriority || "medium",
      });
      setNewTitle("");
      setNewDesc("");
      setNewDue("");
      setNewPriority("medium");
      // Refresh list (respect filters)
      fetchTasks(filter === "all" ? "" : filter);
    } catch (e) {
      console.error("Add task failed", e);
      window.alert("Failed to add task");
    }
  }

  async function toggleStatus(task) {
    try {
      const nextStatus = task.status === "open" ? "done" : "open";
      const patch = { status: nextStatus };
      // If marking done, bump progress to 100
      if (nextStatus === "done") patch.progress = 100;
      await api.patch(`/tasks/${task.id}`, patch);
      fetchTasks(filter === "all" ? "" : filter);
    } catch (e) {
      console.error("Toggle task failed", e);
      window.alert("Failed to update task");
    }
  }

  async function updateProgress(task, value) {
    try {
      const v = Math.max(0, Math.min(100, Number(value)));
      await api.patch(`/tasks/${task.id}`, { progress: v });
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, progress: v } : t));
    } catch (e) {
      console.error("Update progress failed", e);
      window.alert("Failed to update progress");
    }
  }

  async function removeTask(task) {
    if (!window.confirm("Delete this task?")) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      fetchTasks(filter === "all" ? "" : filter);
    } catch (e) {
      console.error("Delete task failed", e);
      window.alert("Failed to delete task");
    }
  }

  return (
    <div className="settings-container">
      <div className="settings-card" style={{ marginBottom: "1rem" }}>
        <h3>Tasks</h3>
        <p>Track action items from chat and growth recommendations.</p>
      </div>

      {/* Add Task */}
      <div className="settings-card" style={{ marginBottom: "1rem" }}>
        <h4>Add Task</h4>
        <form onSubmit={addTask} style={{ display: "grid", gap: "0.75rem" }}>
          <input
            className="subdomain-field"
            placeholder="Task title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <textarea
            className="prompt-textarea"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={3}
            style={{ minHeight: 80 }}
          />
          <div className="form-grid" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div className="form-row" style={{ display: "grid", gap: "0.25rem" }}>
              <label>Due date</label>
              <input
                className="subdomain-field"
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
              />
            </div>
            <div className="form-row" style={{ display: "grid", gap: "0.25rem" }}>
              <label>Priority</label>
              <select
                className="theme-select"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="generate-btn" type="submit" style={{ maxWidth: 220 }}>
              + Add Task
            </button>
            <select
              className="theme-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ maxWidth: 220 }}
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="done">Done</option>
            </select>
            <select
              className="theme-select"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{ maxWidth: 220 }}
            >
              <option value="all">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </form>
      </div>

      {/* Task List */}
      <div className="settings-card">
        <h4 style={{ marginBottom: "0.75rem" }}>
          {filter === "all" ? "All Tasks" : filter === "open" ? "Open Tasks" : "Completed Tasks"}
        </h4>

        {loading ? (
          <div className="loading-state" style={{ margin: 0 }}>
            <div className="loading-spinner" />
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="loading-state" style={{ margin: 0 }}>
            <div className="empty-icon" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📝</div>
            <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>No tasks found</div>
            <div>Add your first task above.</div>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
            {tasks.map((t) => (
              <li
                key={t.id}
                className="page-item"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span>{t.title}</span>
                    <span
                      className="impact-badge"
                      style={{
                        background:
                          t.status === "done"
                            ? "linear-gradient(135deg, var(--success-600), var(--success-500))"
                            : "linear-gradient(135deg, var(--warning-600), var(--warning-500))",
                      }}
                    >
                      {t.status === "done" ? "Done" : "Open"}
                    </span>
                    <span
                      className="impact-badge"
                      style={{
                        background:
                          t.priority === "high"
                            ? "linear-gradient(135deg, #dc2626, #ef4444)"
                            : t.priority === "low"
                            ? "linear-gradient(135deg, #10b981, #34d399)"
                            : "linear-gradient(135deg, #f59e0b, #fbbf24)",
                      }}
                    >
                      {t.priority ? t.priority.toUpperCase() : "MEDIUM"}
                    </span>
                  </div>
                  {t.description && (
                    <div style={{ color: "var(--text-secondary)", marginTop: "0.25rem", maxWidth: 700 }}>
                      {t.description}
                    </div>
                  )}
                  <div style={{ color: "var(--text-tertiary)", marginTop: "0.25rem", fontSize: "0.85rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <span>Source: {t.source || "manual"}</span>
                    <span>Created: {new Date(t.createdAt).toLocaleString()}</span>
                    {t.dueDate && <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>}
                  </div>
                  <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={t.progress || 0}
                      onChange={(e) => updateProgress(t, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <span style={{ minWidth: 40, textAlign: "right", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {Number(t.progress || 0)}%
                    </span>
                  </div>
                </div>
                <div className="page-actions">
                  <button className="edit-btn" onClick={() => toggleStatus(t)}>
                    {t.status === "open" ? "Mark Done" : "Reopen"}
                  </button>
                  <button className="delete-btn" onClick={() => removeTask(t)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
