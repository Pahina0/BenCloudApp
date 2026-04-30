import { boot } from "quasar/wrappers";
import { Dialog } from "quasar";
import axios from "axios";

import { taskNotifications } from "src/composables/tasks/task-notifications";

export default boot(({ router }) => {
  const notified = new Set();

  taskNotifications.ensureConnected();

  taskNotifications.on("ws:batchTaskComplete", async (evt) => {
    const msg = evt?.detail || {};
    const batchTaskId = msg.batchTaskId;
    if (!batchTaskId) return;

    const key = String(batchTaskId);
    if (notified.has(key)) return;
    notified.add(key);

    let taskUuid = null;
    try {
      const res = await axios.get(`${process.env.API_SERVER}/api/batch-tasks/${batchTaskId}/scenarios`);
      const tasks = res?.data?.tasks || [];
      const hif = tasks.find((t) => t.task_type === "HIF") || tasks[0];
      taskUuid = hif?.task_uuid || null;
    } catch (e) {
      // ignore; allow dialog without deep-link
    }

    Dialog.create({
      title: "Task completed",
      message: msg?.message ? String(msg.message) : `Batch task ${batchTaskId} completed.`,
      ok: { label: taskUuid ? "View results" : "OK", color: "primary" },
      cancel: taskUuid ? { label: "Close", flat: true } : false,
    }).onOk(() => {
      if (taskUuid) {
        router.push({ path: `/datacenter/view-export-task/${batchTaskId}-${taskUuid}` });
      }
    });

    // Ensure task lists refresh if user is on those pages
    window.dispatchEvent(new Event("bencloud:tasks-updated"));
  });
});

