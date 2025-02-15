# openai_integration.py
import openai
import time
import logging
from config import OPENAI_API_KEY, MODEL_NAME, MAX_OPENAI_RETRIES

openai.api_key = OPENAI_API_KEY

def send_request(prompt):
    retries = 0
    while retries < MAX_OPENAI_RETRIES:
        try:
            response = openai.ChatCompletion.create(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            return response.choices[0].message['content'].strip()
        except Exception as e:
            logging.error(f"OpenAI request failed: {e}")
            retries += 1
            time.sleep(1)
    return "Error: Unable to get response from OpenAI."

def generate_test_cases(step_description):
    test_prompt = (
        f"Based on the following step description, generate a concise list of test case descriptions "
        f"to verify the functionality implemented in this step. Do not provide code, just a clear list.\n\n"
        f"Step: {step_description}"
    )
    return send_request(test_prompt)
