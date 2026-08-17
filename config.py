import os
from dotenv import load_dotenv

load_dotenv()

class ConfigMeta(type):
    @property
    def GEMINI_API_KEY(cls):
        # Direct lookups
        for var_name in ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_KEY', 'API_KEY', 'GEMINI_API']:
            val = os.environ.get(var_name)
            if val and val.strip():
                return val.strip().strip('"').strip("'")

        # Fuzzy / case-insensitive search in os.environ
        for env_k, env_v in os.environ.items():
            clean_k = env_k.strip().upper()
            if ('GEMINI' in clean_k or 'GOOGLE' in clean_k) and 'KEY' in clean_k:
                if env_v and env_v.strip():
                    return env_v.strip().strip('"').strip("'")
        return None

class Config(metaclass=ConfigMeta):
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-secret-key-for-dev')
    DATABASE_PATH = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance', 'app.db')


