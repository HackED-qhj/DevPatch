# config.py
import os

# Load OpenAI API key from environment variable.
# Set the environment variable OPENAI_API_KEY (do not hard-code your key here).
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("Please set the OPENAI_API_KEY environment variable.")

MODEL_NAME = "gpt-4"
MAX_OPENAI_RETRIES = 3
