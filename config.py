import os
from dotenv import load_dotenv

load_dotenv()

class ConfigMeta(type):
    @property
    def GEMINI_API_KEY(cls):
        key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY') or os.environ.get('GEMINI_KEY')
        if key:
            return key.strip().strip('"').strip("'")
        return None

class Config(metaclass=ConfigMeta):
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-secret-key-for-dev')
    DATABASE_PATH = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance', 'app.db')

