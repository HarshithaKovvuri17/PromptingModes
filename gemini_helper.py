import google.generativeai as genai
from config import Config
import json
import yaml
import re

# Configure the API key
if Config.GEMINI_API_KEY:
    genai.configure(api_key=Config.GEMINI_API_KEY)

MODEL_NAME = 'gemini-3.6-flash'

def get_model():
    return genai.GenerativeModel(MODEL_NAME)

def generate_normal_response(prompt):
    """
    Sends a standard prompt to the Gemini API.
    """
    try:
        model = get_model()
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error generating response: {str(e)}"

def extract_code_block(text):
    """Attempts to extract JSON or YAML from markdown code blocks or plain text."""
    match = re.search(r'```(?:json|yaml|yml)?\s*(.*?)\s*```', text, re.DOTALL | re.IGNORECASE)
    if match and match.group(1).strip():
        return match.group(1).strip()
    return text.strip()

def extract_json_block(text):
    """Attempts to extract JSON from markdown code blocks or plain text."""
    return extract_code_block(text)

def generate_json_or_yaml_with_refinement(prompt, max_retries=2):
    """
    Attempts to generate valid JSON or YAML. If it fails to parse, prompts the model again to fix syntax errors.
    Returns (parsed_data, final_raw_text, format_type, was_refined, success).
    """
    model = get_model()
    current_prompt = prompt
    was_refined = False
    
    for attempt in range(max_retries):
        try:
            response = model.generate_content(current_prompt)
            raw_text = response.text
            
            extracted_block = extract_code_block(raw_text)
            
            # 1. Try parsing JSON first
            try:
                parsed_data = json.loads(extracted_block)
                return parsed_data, raw_text, 'json', was_refined, True
            except json.JSONDecodeError:
                pass
                
            # 2. Try parsing YAML next
            try:
                parsed_data = yaml.safe_load(extracted_block)
                if isinstance(parsed_data, (dict, list)):
                    return parsed_data, raw_text, 'yaml', was_refined, True
            except Exception:
                pass
            
            # Syntax retry
            was_refined = True
            current_prompt = f"{prompt}\n\nThe previous attempt produced invalid JSON/YAML formatting. Please provide ONLY valid, parseable JSON or YAML without conversational text."
            
        except Exception as e:
            return None, f"Error: {str(e)}", 'unknown', was_refined, False

    return None, raw_text, 'unknown', was_refined, False

def generate_json_with_refinement(prompt, max_retries=2):
    parsed_data, raw_text, fmt_type, was_refined, success = generate_json_or_yaml_with_refinement(prompt, max_retries)
    return parsed_data, raw_text, was_refined, success

