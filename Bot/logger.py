# logger.py
import logging

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        filename='bot.log',
        filemode='a',
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
