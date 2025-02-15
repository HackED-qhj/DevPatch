# main.py
import asyncio
import os
import logging
import threading
import time
import json

from bot_state import BotState
from file_watcher import FileWatcher
from openai_integration import send_request, generate_test_cases
from logger import setup_logging

# Setup logging to a file named 'bot.log'
setup_logging()
logging.info("Bot started.")

# Global asyncio event to signal a file change.
file_change_flag = asyncio.Event()

# Callback function for file change events.
def file_change_callback(file_path, event_type):
    logging.info(f"File changed: {file_path} - {event_type}")
    file_change_flag.set()

def check_step_completion(step):
    """
    Checks all .py files (excluding certain directories) for the presence of the token.
    The token is expected to be a snippet (e.g., 'def main(') that indicates the step is complete.
    """
    token = step.get("token")
    if not token:
        return False
    for root, dirs, files in os.walk('.'):
        # Skip directories that are not relevant (e.g., .git, Bot folder)
        if '.git' in dirs:
            dirs.remove('.git')
        if 'Bot' in dirs:
            dirs.remove('Bot')
        for file in files:
            if file.endswith('.py'):
                try:
                    with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                        content = f.read()
                        if token in content:
                            return True
                except Exception as e:
                    logging.error(f"Error reading {file}: {e}")
    return False

def initialize_steps(bot_state):
    """
    Prompts the user for a project idea and uses OpenAI to generate a JSON array of steps.
    Each step should be an object with keys "description" and "token".
    """
    print("Please enter your project idea:")
    project_idea = input("> ")

    prompt = (
        f"Given the following project idea, generate a JSON array of steps needed to build the project. "
        f"Each step should be an object with two keys: 'description' and 'token'. "
        f"The 'description' should instruct what to do in that step, and the 'token' should be a code snippet or keyword "
        f"that indicates the step is complete. "
        f"Project idea: {project_idea}"
    )
    logging.info("Sending project idea to OpenAI to generate steps.")
    response = send_request(prompt)
    logging.info(f"Received steps response: {response}")

    try:
        steps = json.loads(response)
        if not isinstance(steps, list):
            raise ValueError("Generated steps is not a list.")
        bot_state.steps = steps
        print("Project steps generated successfully:")
        for idx, step in enumerate(bot_state.steps, 1):
            print(f"Step {idx}: {step.get('description')}")
    except Exception as e:
        logging.error(f"Error parsing steps from OpenAI: {e}")
        print("Error generating steps. Please ensure OpenAI returned a valid JSON array.")
        exit(1)

async def main_loop():
    bot_state = BotState()

    # Initialize steps using user input and OpenAI in a separate thread.
    await asyncio.to_thread(initialize_steps, bot_state)

    # Start the file watcher in a separate thread.
    watcher = FileWatcher('.', file_change_callback)
    watcher_thread = threading.Thread(target=watcher.start, daemon=True)
    watcher_thread.start()
    logging.info("File watcher started.")

    while True:
        current_step = bot_state.get_current_step()
        if not current_step:
            logging.info("All steps complete!")
            print("All steps complete!")
            break

        # If no suggestion has been given for the current step, send the prompt to OpenAI.
        if not bot_state.current_suggestion:
            prompt = current_step["description"]
            logging.info(f"Sending step prompt to OpenAI: {prompt}")
            suggestion = send_request(prompt)
            bot_state.current_suggestion = suggestion
            logging.info(f"Received suggestion: {suggestion}")
            # Display the suggestion (simulating the text cloud on the bot image).
            print(f"\nBot Suggestion for current step:\n{suggestion}\n")

        # Wait for a file change event.
        await file_change_flag.wait()
        file_change_flag.clear()
        # Small delay to allow file saving to finish.
        await asyncio.sleep(2)

        # Check if the current step is complete.
        if check_step_completion(current_step):
            logging.info("Current step appears complete.")
            print("\nStep appears complete!")
            # Prompt user for generating test cases.
            print("We should run some tests! Do you want to generate test cases? (y/n)")
            user_input = input("> ")
            if user_input.lower() in ['y', 'yes']:
                logging.info("User requested test cases generation.")
                test_cases = generate_test_cases(current_step["description"])
                print("\nGenerated Test Cases:")
                print(test_cases)
            # Mark the current step as complete.
            bot_state.complete_current_step()
            bot_state.current_suggestion = None
            print("\nMoving to next step...\n")
        else:
            logging.info("Current step not complete yet.")

        await asyncio.sleep(1)

    # Stop the file watcher when finished.
    watcher.stop()
    logging.info("Bot finished all steps.")

if __name__ == "__main__":
    try:
        asyncio.run(main_loop())
    except KeyboardInterrupt:
        logging.info("Bot interrupted by user.")
