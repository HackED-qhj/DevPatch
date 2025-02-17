import json
import logging
from flask import Flask, request, jsonify
from bot_state import BotState
from openai_integration import send_request, get_sample_snippet
from logger import setup_logging

setup_logging()
logging.info("Starting Bot Flask App...")

app = Flask(__name__)

# Global bot state
bot_state = BotState()

@app.route('/initialize', methods=['POST'])
def initialize():
    try:
        data = request.get_json()
        project_idea = data.get('projectIdea', '').strip()
        if not project_idea:
            logging.error("No project idea provided in request.")
            return jsonify({"error": "Project idea is required."}), 400

        logging.info(f"Received project idea: {project_idea}")

        # Build prompt for OpenAI to generate project steps
        prompt = (
            f"Given the following project idea, generate a JSON array of steps needed to build the project. "
            f"Each step should be an object with two keys: 'description' and 'token'. "
            f"The 'description' should instruct what to do in that step, and the 'token' should be a code snippet or keyword "
            f"that indicates the step is complete. "
            f"Project idea: {project_idea}"
        )

        response = send_request(prompt)
        logging.info(f"Response from OpenAI: {response}")

        steps = json.loads(response)
        if not isinstance(steps, list):
            raise ValueError("Expected a JSON array of steps.")
        # Store steps in bot state
        bot_state.steps = steps
        logging.info("Steps stored in bot state successfully.")
        first_step = steps[0]
        logging.info(f"First step: {first_step['description']}")
        return jsonify({"response": first_step["description"]})
    except Exception as e:
        logging.error(f"Error in /initialize: {e}")
        return jsonify({"error": "Failed to generate steps."}), 500

@app.route('/message', methods=['POST'])
def message():
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        current_step = bot_state.get_current_step()
        if not current_step:
            return jsonify({"response": "All steps complete!"})
        if message == "I'm still confused":
            if not bot_state.current_suggestion:
                bot_state.current_suggestion = send_request(current_step["description"])
            response_text = bot_state.current_suggestion
        elif message == "can you give me an example?":
            response_text = get_sample_snippet(current_step["description"])
        else:
            response_text = "Invalid option."
        logging.info(f"Received message: {message}, responding with: {response_text}")
        return jsonify({"response": response_text})
    except Exception as e:
        logging.error(f"Error in /message: {e}")
        return jsonify({"error": "Failed to process message."}), 500

if __name__ == '__main__':
    app.run(debug=True)
