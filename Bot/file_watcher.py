# file_watcher.py
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import logging

class ChangeHandler(FileSystemEventHandler):
    def __init__(self, callback):
        self.callback = callback

    def on_any_event(self, event):
        if not event.is_directory:
            self.callback(event.src_path, event.event_type)

class FileWatcher:
    def __init__(self, directory, callback):
        self.directory = directory
        self.callback = callback
        self.event_handler = ChangeHandler(self.callback)
        self.observer = Observer()

    def start(self):
        self.observer.schedule(self.event_handler, self.directory, recursive=True)
        self.observer.start()

    def stop(self):
        self.observer.stop()
        try:
            self.observer.join()
        except RuntimeError as e:
            # If observer thread was never fully started, ignore the join error.
            logging.error("Observer thread join error: " + str(e))
