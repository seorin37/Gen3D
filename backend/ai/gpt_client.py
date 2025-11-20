import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY")

def parse_prompt_to_json(prompt: str):
    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Convert text prompt into structured 3D scene JSON"},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message["content"]
