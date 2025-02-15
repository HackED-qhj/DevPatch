# test_runner.py
import subprocess
import logging

def run_tests(test_cases):
    """Executes dynamically generated test cases"""
    print("\nSuggested Test Cases:\n")
    print(test_cases)
    
    user_input = input("\nRun these tests? (yes/no): ").strip().lower()
    if user_input != "yes":
        return "Tests skipped."

    try:
        # You can modify this command to match your test framework
        result = subprocess.run(["pytest"], capture_output=True, text=True, timeout=30)
        return result.stdout + "\n" + result.stderr
    except Exception as e:
        logging.error(f"Error running tests: {e}")
        return f"Error running tests: {e}"
