import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def parse_prompt_with_gemini(prompt: str):
    model = genai.GenerativeModel("gemini-1.5-pro")
    res = model.generate_content(f"Convert this prompt to a JSON scene: {prompt}")
    return res.text
