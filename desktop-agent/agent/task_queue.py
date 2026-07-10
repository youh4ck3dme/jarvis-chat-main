"""
Agent task queue for running complex multi-step background tasks autonomously.
"""
import uuid
import queue
import logging
import threading
from enum import Enum
from typing import Callable, Any

logger = logging.getLogger("task_queue")

class TaskPriority(Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2

class Task:
    def __init__(self, goal: str, priority: TaskPriority, speak_fn: Callable[[str], None]):
        self.id = str(uuid.uuid4())[:8]
        self.goal = goal
        self.priority = priority
        self.speak = speak_fn
        self.status = "queued"

    def run(self):
        self.status = "running"
        logger.info(f"[TaskQueue] Executing task {self.id}: {self.goal}")
        try:
            self.speak(f"Starting background task to: {self.goal}")
            # Stub: in a real implementation this would invoke the dev_agent or executor
            import time
            time.sleep(5)
            self.status = "completed"
            self.speak(f"Task completed successfully: {self.goal}")
        except Exception as e:
            self.status = "failed"
            logger.error(f"[TaskQueue] Task {self.id} failed: {e}")
            self.speak(f"Task failed: {self.goal}. Error: {e}")

class TaskQueue:
    def __init__(self):
        self._queue = queue.PriorityQueue()
        self._worker_thread = None
        self._running = False
        self.start()

    def submit(self, goal: str, priority: TaskPriority, speak: Callable[[str], None]) -> str:
        task = Task(goal, priority, speak)
        # PriorityQueue uses sorting, we pass (-priority_value, task_id, task)
        # Priority order: HIGH (2) first, so we push negative value for max-heap behavior
        self._queue.put((-priority.value, task.id, task))
        logger.info(f"[TaskQueue] Submitted task {task.id} (priority: {priority.name})")
        return task.id

    def start(self):
        if not self._running:
            self._running = True
            self._worker_thread = threading.Thread(target=self._worker, daemon=True, name="task-queue-worker")
            self._worker_thread.start()

    def stop(self):
        self._running = False

    def _worker(self):
        while self._running:
            try:
                # Non-blocking get with timeout to allow exit/stop check
                _, _, task = self._queue.get(timeout=1.0)
                task.run()
                self._queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"[TaskQueue] Worker error: {e}")

_instance = None

def get_queue() -> TaskQueue:
    global _instance
    if _instance is None:
        _instance = TaskQueue()
    return _instance
