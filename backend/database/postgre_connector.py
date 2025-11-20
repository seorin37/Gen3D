import psycopg2
import os

POSTGRES_URL = os.getenv("POSTGRES_URL")

def get_connection():
    return psycopg2.connect(POSTGRES_URL)
