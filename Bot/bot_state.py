# bot_state.py
class BotState:
    def __init__(self):
        self.current_step_index = 0
        # Steps will be generated at runtime based on the project idea.
        self.steps = []  
        self.current_suggestion = None

    def get_current_step(self):
        if self.current_step_index < len(self.steps):
            return self.steps[self.current_step_index]
        return None

    def complete_current_step(self):
        self.current_step_index += 1
