"""
Action: computer_control
Performs system-level management actions (sleep, lock, restart, battery status, processes).
"""
import os
import shutil
import subprocess
import logging
import psutil

logger = logging.getLogger("computer_control")

def computer_control(parameters: dict, player=None) -> str:
    action = parameters.get("action", "").lower().strip()
    process_name = parameters.get("process_name", "").strip()

    if not action:
        return "Error: Action parameter is required."

    logger.info(f"Computer control action: {action}")

    try:
        if action == "lock":
            # AppleScript to lock macOS screen
            script = 'tell application "System Events" to keystroke "q" using {control down, command down}'
            subprocess.run(["osascript", "-e", script], check=True)
            return "Screen locked."

        elif action == "sleep":
            subprocess.run(["osascript", "-e", 'tell application "System Events" to sleep'], check=True)
            return "Mac put to sleep mode."

        elif action == "restart":
            subprocess.run(["osascript", "-e", 'tell application "System Events" to restart'], check=True)
            return "System restart command sent."

        elif action == "shutdown":
            # Requires confirmation or admin, let's trigger standard macOS shutdown UI
            script = 'tell application "System Events" to shut down'
            subprocess.run(["osascript", "-e", script], check=True)
            return "System shutdown command sent."

        elif action == "battery":
            # Run pmset to get battery details
            res = subprocess.run(["pmset", "-g", "batt"], capture_output=True, text=True, check=True)
            return res.stdout.strip()

        elif action == "disk":
            total, used, free = shutil.disk_usage("/")
            gb = 1024 ** 3
            return (
                f"Disk Usage:\n"
                f"- Total: {total / gb:.1f} GB\n"
                f"- Used: {used / gb:.1f} GB ({used / total * 100:.1f}%)\n"
                f"- Free: {free / gb:.1f} GB"
            )

        elif action == "network":
            # Simple interface status check
            res = subprocess.run(["networksetup", "-listallhardwareports"], capture_output=True, text=True, check=True)
            return res.stdout.strip()[:1000]

        elif action == "processes":
            # List top 10 CPU-consuming processes
            proc_list = []
            for proc in sorted(psutil.process_iter(['name', 'cpu_percent']), key=lambda p: p.info['cpu_percent'] or 0, reverse=True)[:10]:
                proc_list.append(f"- {proc.info['name']}: {proc.info['cpu_percent']}% CPU")
            return "Top 10 Active Processes:\n" + "\n".join(proc_list)

        elif action == "kill_process":
            if not process_name:
                return "Error: Process name is required to terminate it."
            
            killed_count = 0
            for proc in psutil.process_iter(['pid', 'name']):
                if process_name.lower() in proc.info['name'].lower():
                    proc.kill()
                    killed_count += 1
            
            if killed_count > 0:
                return f"Successfully terminated {killed_count} instances of '{process_name}'."
            return f"No running processes found matching name '{process_name}'."

        else:
            return f"Unknown system control action: {action}"

    except Exception as e:
        logger.error(f"Computer control action failed: {e}")
        return f"Failed to execute system action: {e}"
