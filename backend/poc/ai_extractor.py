import os
import pypdf
from typing import Dict, Any
import json
from openai import OpenAI

# NOTE: You need to set your OPENAI_API_KEY environment variable
# export OPENAI_API_KEY="sk-..."

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract raw text from PDF using pypdf"""
    try:
        reader = pypdf.PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""

def analyze_with_llm(text: str) -> Dict[str, Any]:
    """Send text to LLM to extract structured data"""
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    
    prompt = """
    You are an expert Construction Engineer AI. 
    Analyze the following material submittal text and extract the following JSON structure:
    {
        "material_description": {
            "type": "string",
            "manufacturer": "string",
            "model_number": "string",
            "standards": ["list of strings (ASTM/BS/EN)"]
        },
        "documents_present": ["list of document types found (e.g. Datasheet, Warranty)"],
        "project_details": {
            "project_name": "string or null",
            "consultant": "string or null"
        },
        "compliance_summary": "Short assessment of what is missing or unclear"
    }
    
    Input Text:
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",  # or gpt-3.5-turbo if cost is a concern
            messages=[
                {"role": "system", "content": "You are a helpful assistant that outputs only valid JSON."},
                {"role": "user", "content": prompt + text[:15000]} # Truncate to avoid context limits
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # Test with the provided PDF
    pdf_path = "../../AI-Enabled Material Submittal & Compliance Review System (1).pdf"
    
    print(f"--- 1. Extracting Text from {pdf_path} ---")
    raw_text = extract_text_from_pdf(pdf_path)
    print(f"Extracted {len(raw_text)} characters.")
    
    if len(raw_text) > 100:
        print("\n--- 2. Analyzing with AI ---")
        if not os.environ.get("OPENAI_API_KEY"):
            print("SKIPPING AI: OPENAI_API_KEY not set.")
        else:
            result = analyze_with_llm(raw_text)
            print(json.dumps(result, indent=2))
