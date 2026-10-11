"""Test setup: fully offline + throw-away database, so tests need no internet, keys or state."""
import os
import tempfile

os.environ["SANKET_OFFLINE"] = "1"
os.environ["SANKET_DB_PATH"] = os.path.join(tempfile.mkdtemp(prefix="sanket_test_"), "test.db")
