import pypdf
import os
import json
import base64
import google.generativeai as genai
from openai import OpenAI
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.system_setting import SystemSetting
try:
    import pymupdf as fitz
except ImportError:
    fitz = None

class AIService:
    def __init__(self):
        self.openai_key = settings.OPENAI_API_KEY
        self.google_key = settings.GOOGLE_API_KEY
        
        self.openai_client = None
        if self.openai_key:
            self.openai_client = OpenAI(api_key=self.openai_key)
            
        if self.google_key:
            genai.configure(api_key=self.google_key)

    def get_provider(self, db: Session = None) -> str:
        if not db:
            return "openai" # Default if no DB context
            
        setting = db.query(SystemSetting).filter(SystemSetting.key == "preferred_ai_provider").first()
        return setting.value if setting else "openai"

    async def process_document(self, file_path: str, db: Session = None) -> dict:
        """
        Main entry point for processing. Delegates to the configured provider.
        """
        provider = self.get_provider(db)
        print(f"Processing document with provider: {provider}")
        
        ext = os.path.splitext(file_path)[1].lower()
        is_image = ext in ['.jpg', '.jpeg', '.png', '.webp']
        
        if provider == "gemini" and self.google_key:
            return await self._process_with_gemini(file_path, is_image)
        elif self.openai_client:
            return await self._process_with_openai(file_path, is_image)
        else:
            return self._mock_analyze_compliance("No AI Provider Configured")

    # --- OpenAI Implementation ---
    async def _process_with_openai(self, file_path: str, is_image: bool) -> dict:
        if is_image:
            return await self._analyze_image_openai(file_path)
        else:
            text = self._extract_text(file_path)
            return await self._analyze_text_openai(text)

    async def _analyze_image_openai(self, image_path: str) -> dict:
        try:
            with open(image_path, "rb") as image_file:
                base64_image = base64.b64encode(image_file.read()).decode('utf-8')
            
            ext = os.path.splitext(image_path)[1].lower().replace('.', '')
            mime_type = f"image/{ext}" if ext != 'jpg' else "image/jpeg"

            response = self.openai_client.chat.completions.create(
                model="gpt-4o", # Upgraded from gpt-4-turbo
                messages=[
                    {
                        "role": "system",
                        "content": "You are a construction compliance expert. Analyze the provided image (material tag, site photo, or document) and return a JSON object with: status (APPROVED, REJECTED, REVISE_RESUBMIT, PENDING_REVIEW), summary (string), issues (list of strings), and checked_standards (list of strings)."
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Analyze this material submittal image for technical compliance:"},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"OpenAI Vision error: {e}")
            return self._mock_analyze_compliance(f"OpenAI Vision Failed: {str(e)}")

    async def _analyze_text_openai(self, text: str) -> dict:
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a construction compliance expert. Analyze the provided document text and return a JSON object with: status (APPROVED, REJECTED, REVISE_RESUBMIT, PENDING_REVIEW), summary (string), issues (list of strings), and checked_standards (list of strings)."},
                    {"role": "user", "content": f"Analyze this material submittal text:\n\n{text[:15000]}"}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"OpenAI Text error: {e}")
            return self._mock_analyze_compliance(error_msg=str(e))

    # --- Gemini Implementation ---
    async def _process_with_gemini(self, file_path: str, is_image: bool) -> dict:
        try:
            model = genai.GenerativeModel('gemini-1.5-pro')
            
            prompt = """
            You are a construction compliance expert. Analyze this material submittal.
            Return a JSON object with the following structure:
            {
                "status": "APPROVED" | "REJECTED" | "REVISE_RESUBMIT" | "PENDING_REVIEW",
                "summary": "Brief executive summary of findings",
                "issues": ["list", "of", "issues"],
                "checked_standards": ["list", "of", "standards", "found"]
            }
            """
            
            if is_image:
                import PIL.Image
                img = PIL.Image.open(file_path)
                response = model.generate_content([prompt, img])
            else:
                # PDF handling - Gemini can handle PDFs directly via File API or extensive text
                # For simplicity here, we'll extract text first. 
                # Ideally, we upload the PDF to Gemini File API for full analysis.
                text = self._extract_text(file_path)
                response = model.generate_content([prompt, text[:30000]]) # Gemini determines visual/text context
            
            # Simple cleanup for JSON parsing (Gemini sometimes wraps in markdown blocks)
            content = response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
            
        except Exception as e:
            print(f"Gemini error: {e}")
            return self._mock_analyze_compliance(f"Gemini Failed: {str(e)}")

    async def refine_requirement(self, sentence: str) -> dict:
        """
        Refines a raw requirement sentence into a structured field name and description.
        """
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a construction requirement analyzer. Convert a raw requirement sentence into a structured JSON object with 'field_name' (max 4 words) and 'description' (clear technical summary)."},
                    {"role": "user", "content": f"Refine this requirement: {sentence}"}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Refine requirement error: {e}")
            return {"field_name": sentence[:30], "description": sentence}

    # --- Shared Logic ---
    async def verify_requirements_with_ai(self, extracted_data: str | dict, requirements: list, image_paths: list = None, db: Session = None) -> list:
        """
        Intelligently verifies requirements against extracted data and optional images.
        """
        provider = self.get_provider(db)
        image_paths = image_paths or []
        
        # Prepare context
        context_str = json.dumps(extracted_data) if isinstance(extracted_data, dict) else str(extracted_data)
        req_list_str = json.dumps(requirements)
        
        system_prompt = """
        You are a construction compliance QA Engineer. 
        Verify if the provided 'Document Context' (text and/or images) satisfies the 'Requirements List'.
        
        CRITICAL RULES:
        1. Return a JSON object with a key "results" containing an ARRAY of objects.
        2. Each object in the array MUST match a requirement from the input list.
        3. Use the EXACT "field_name" AND "id" from the input requirements list.
        4. Status MUST be either "PASSED" or "WARNING".
        5. Provide a detailed "message" explaining the verification result.
        6. IMPORTANT: Include the "id" field from the input requirement in your response.
        """
        
        user_prompt_text = f"""
        Requirements List (Strict Matching Required - preserve the 'id' field):
        {req_list_str}
        
        Document Context (Text):
        {context_str[:20000]}
        
        Please verify each requirement based on the text and any provided images.
        Return the results as a JSON array inside a "results" key.
        Each result MUST include: id (from input), field_name (from input), status, and message.
        """

        try:
            content = ""
            if provider == "gemini" and self.google_key:
                model = genai.GenerativeModel('gemini-1.5-pro')
                inputs = [system_prompt + "\n" + user_prompt_text]
                
                # Add images to Gemini inputs
                import PIL.Image
                for path in image_paths:
                    if os.path.exists(path):
                        inputs.append(PIL.Image.open(path))
                
                response = model.generate_content(inputs)
                content = response.text
                
            elif self.openai_client:
                # Prepare OpenAI Multimodal Messages
                user_content = [{"type": "text", "text": user_prompt_text}]
                
                for path in image_paths:
                    if os.path.exists(path):
                        with open(path, "rb") as f:
                            b64 = base64.b64encode(f.read()).decode('utf-8')
                        ext = os.path.splitext(path)[1].lower().replace('.', '')
                        mime = f"image/{ext}" if ext != 'jpg' else "image/jpeg"
                        user_content.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{b64}"}
                        })

                response = self.openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    response_format={"type": "json_object"}
                )
                content = response.choices[0].message.content
            
            # Parsing logic
            cleaned = content.replace("```json", "").replace("```", "").strip()
            results = []
            
            # If wrapped in object key 'results' or similar, handle it. 
            # Or if it's a raw list.
            if cleaned.startswith("{"):
                data = json.loads(cleaned)
                if "results" in data: 
                    results = data["results"]
                elif "verification" in data: 
                    results = data["verification"]
                else:
                    # Try to find a list value
                    for k,v in data.items():
                        if isinstance(v, list): 
                            results = v
                            break
            elif cleaned.startswith("["):
                results = json.loads(cleaned)
            
            # Post-process: Ensure requirement_id is in all results
            # Match results back to original requirements by field_name
            req_map = {req.get("field_name"): req.get("id") for req in requirements if req.get("id") is not None}
            
            for result in results:
                field_name = result.get("field_name")
                # If AI didn't include the ID, or it's missing, try to map it
                if "id" in result:
                    result["requirement_id"] = result.pop("id")  # Rename 'id' to 'requirement_id'
                elif field_name in req_map:
                    result["requirement_id"] = req_map[field_name]
                    
            return results if results else []
                
        except Exception as e:
            error_msg = f"Verification AI Error: {str(e)}"
            print(error_msg)
            # Fallback to smart keyword matching if AI fails
            fallback_results = self._verify_compliance_matrix_fallback(context_str, requirements)
            # Attach error to the first item for visibility if possible
            if fallback_results:
                fallback_results[0]["extraction_error"] = error_msg
            return fallback_results

    def _verify_compliance_matrix_fallback(self, text: str, requirements: list) -> list:
        text_lower = text.lower()
        results = []
        for req in requirements:
            field_name = req.get("field_name", "")
            requirement_id = req.get("id")
            keywords = field_name.lower().split()
            found = any(word in text_lower for word in keywords) if keywords else False
            result = {
                "field_name": field_name,
                "status": "PASSED" if found else "WARNING",
                "message": f"Keyword match found." if found else "Keyword not found (Fallback)."
            }
            if requirement_id is not None:
                result["requirement_id"] = requirement_id
            results.append(result)
        return results

    def _extract_text(self, pdf_path: str) -> str:
        try:
            reader = pypdf.PdfReader(pdf_path)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                # Simple check for garbled/PUA text
                if page_text:
                    text += page_text + "\n"
            
            # If text is nearly empty or looks like garbage (lots of PUA characters)
            pua_chars = sum(1 for c in text if '\uf000' <= c <= '\uf8ff')
            is_garbage = (len(text) > 0 and pua_chars / len(text) > 0.3)
            
            if len(text.strip()) < 10 or is_garbage:
                print(f"--- [AI SERVICE] --- Detected poor text quality in {pdf_path} (Garbage: {is_garbage}). Falling back to visual analysis.")
                return "" # Return empty to trigger visual fallback
                
            return text
        except Exception as e:
            print(f"Error extracting text: {e}")
            return ""

    def _mock_analyze_compliance(self, error_msg: str = "") -> dict:
        return {
            "status": "PENDING_REVIEW",
            "summary": f"Automated analysis failed or skipped.",
            "issues": [f"AI error: {error_msg}"],
            "checked_standards": [],
            "confidence_score": 0.0,
            "extraction_error": error_msg
        }

    # =============================================================================
    # ENHANCED STRUCTURED DATA EXTRACTION
    # =============================================================================
    
    async def extract_structured_data(self, file_path: str, db: Session = None) -> dict:
        """
        Main orchestrator for extracting structured technical data from any file type.
        Returns standardized schema with material info, manufacturer, standards, and tables.
        """
        try:
            ext = os.path.splitext(file_path)[1].lower()
            
            # Determine file type and route to appropriate extractor
            if ext == '.pdf':
                return await self._extract_from_pdf(file_path, db)
            elif ext in ['.jpg', '.jpeg', '.png', '.webp']:
                return await self._extract_from_image(file_path, db)
            elif ext in ['.xlsx', '.xls', '.csv']:
                return self._extract_from_excel(file_path)
            else:
                return self._create_empty_extraction(f"Unsupported file type: {ext}")
                
        except Exception as e:
            print(f"Structured extraction error for {file_path}: {e}")
            return self._create_empty_extraction(str(e))
    
    async def _extract_from_pdf(self, pdf_path: str, db: Session = None) -> dict:
        """
        Extract structured data from PDF including tables and metadata.
        Uses visual analysis if text extraction is poor.
        """
        # Extract text
        text = self._extract_text(pdf_path)
        
        # If text is poor, render first 2 pages as images for Vision
        image_paths = []
        if not text or len(text.strip()) < 100:
            image_paths = self._render_pdf_to_images(pdf_path)
            
        # Extract tables from PDF
        tables = await self._extract_tables_from_pdf(pdf_path, db, image_paths)
        
        # Extract material metadata using AI (passing images if available)
        metadata = await self._extract_material_metadata(text, image_paths, db)
        
        # Cleanup temporary images
        for path in image_paths:
            try: os.remove(path)
            except: pass
            
        return {
            **metadata,
            "tables": tables,
            "source_file": os.path.basename(pdf_path)
        }
    
    def _render_pdf_to_images(self, pdf_path: str, max_pages: int = 2) -> list:
        """
        Renders PDF pages to temporary images for vision analysis.
        """
        if not fitz:
            return []
            
        image_paths = []
        try:
            doc = fitz.open(pdf_path)
            for i in range(min(max_pages, len(doc))):
                page = doc.load_page(i)
                # 3x zoom for higher detail on small text usually found in licenses
                pix = page.get_pixmap(matrix=fitz.Matrix(3, 3)) 
                img_path = f"{pdf_path}_page_{i}.png"
                pix.save(img_path)
                image_paths.append(img_path)
            doc.close()
            print(f"--- [AI SERVICE] --- Rendered {len(image_paths)} pages of {pdf_path} to images.")
        except Exception as e:
            print(f"Error rendering PDF to images: {e}")
            
        return image_paths
    
    async def _extract_from_image(self, image_path: str, db: Session = None) -> dict:
        """
        Extract structured data from images (material tags, datasheets, etc.).
        """
        # Extract tables from image
        tables = await self._extract_tables_from_image(image_path, db)
        
        # Extract material metadata
        metadata = await self._extract_material_metadata("", [image_path], db)
        
        return {
            **metadata,
            "tables": tables,
            "source_file": os.path.basename(image_path)
        }
    
    def _extract_from_excel(self, file_path: str) -> dict:
        """
        Extract structured data from Excel/CSV files.
        """
        try:
            import pandas as pd
            
            ext = os.path.splitext(file_path)[1].lower()
            tables = []
            
            if ext == '.csv':
                df = pd.read_csv(file_path)
                tables.append(self._dataframe_to_table(df, "CSV Data"))
            else:
                # Excel file - process all sheets
                excel_file = pd.ExcelFile(file_path)
                for sheet_name in excel_file.sheet_names:
                    df = pd.read_excel(excel_file, sheet_name=sheet_name)
                    tables.append(self._dataframe_to_table(df, sheet_name))
            
            return {
                "material_info": {},
                "manufacturer_info": {},
                "standards": [],
                "tables": tables,
                "extraction_metadata": {
                    "confidence_score": 1.0,  # Excel data is 100% accurate
                    "extraction_method": "Direct Excel Read"
                },
                "source_file": os.path.basename(file_path)
            }
            
        except Exception as e:
            print(f"Excel extraction error: {e}")
            return self._create_empty_extraction(f"Excel read failed: {str(e)}")
    
    def _dataframe_to_table(self, df: 'pd.DataFrame', title: str) -> dict:
        """
        Convert pandas DataFrame to our table format.
        """
        # Clean up the dataframe
        df = df.dropna(how='all')  # Remove completely empty rows
        
        return {
            "title": title,
            "headers": df.columns.tolist(),
            "rows": df.values.tolist(),
            "row_count": len(df),
            "column_count": len(df.columns)
        }
    
    async def _extract_tables_from_pdf(self, pdf_path: str, db: Session = None, provided_image_paths: list = None) -> list:
        """
        Extract tables from PDF using AI vision on each page.
        """
        try:
            provider = self.get_provider(db)
            all_tables = []
            
            # If we have images (from fallback), use them first
            if provided_image_paths:
                for img_path in provided_image_paths:
                    tables = await self._extract_tables_from_image(img_path, db)
                    all_tables.extend(tables)
                if all_tables:
                    return all_tables

            # Otherwise fallback to text parsing (if allowed)
            try:
                reader = pypdf.PdfReader(pdf_path)
                max_pages = min(5, len(reader.pages))
                for page_num in range(max_pages):
                    page = reader.pages[page_num]
                    page_text = page.extract_text()
                    if page_text and self._has_table_indicators(page_text):
                        tables = await self._parse_tables_with_ai(page_text, page_num + 1, provider)
                        all_tables.extend(tables)
            except:
                pass
            
            return all_tables
            
        except Exception as e:
            print(f"PDF table extraction error: {e}")
            return []
    
    def _has_table_indicators(self, text: str) -> bool:
        """
        Quick heuristic check if text might contain tables.
        """
        # Look for common table indicators
        indicators = [
            '\t',  # Tab characters
            '|',   # Pipe separators
            'specification', 'property', 'value', 'parameter',
            'test result', 'requirement', 'standard'
        ]
        text_lower = text.lower()
        return any(ind in text_lower for ind in indicators)
    
    async def _parse_tables_with_ai(self, text: str, page_num: int, provider: str) -> list:
        """
        Use AI to identify and extract tables from text.
        """
        try:
            prompt = f"""
Analyze the following text from page {page_num} and extract any tables present.
Return a JSON object with a "tables" key containing an array of table objects.
Each table object should have:
- "title": Brief description of what the table contains
- "headers": Array of column headers
- "rows": Array of arrays, each representing a row of data

If no tables are found, return {{"tables": []}}.

Text:
{text[:5000]}
"""
            
            if provider == "gemini" and self.google_key:
                model = genai.GenerativeModel('gemini-1.5-pro')
                response = model.generate_content(prompt)
                content = response.text
            elif self.openai_client:
                response = self.openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are a table extraction expert. Extract tables from text and return as structured JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"}
                )
                content = response.choices[0].message.content
            else:
                return []
            
            # Parse response
            cleaned = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned)
            
            tables = data.get("tables", [])
            # Add page number to each table
            for table in tables:
                table["page_number"] = page_num
            
            return tables
            
        except Exception as e:
            print(f"AI table parsing error: {e}")
            return []
    
    async def _extract_tables_from_image(self, image_path: str, db: Session = None) -> list:
        """
        Extract tables from images using AI vision.
        """
        try:
            provider = self.get_provider(db)
            
            with open(image_path, "rb") as f:
                base64_image = base64.b64encode(f.read()).decode('utf-8')
            
            ext = os.path.splitext(image_path)[1].lower().replace('.', '')
            mime_type = f"image/{ext}" if ext != 'jpg' else "image/jpeg"
            
            prompt = """
Analyze this image and extract any tables present (specification tables, test results, etc.).
Return a JSON object with a "tables" key containing an array of table objects.
Each table should have: "title", "headers" (array), and "rows" (array of arrays).
If no tables found, return {"tables": []}.
"""
            
            if provider == "gemini" and self.google_key:
                import PIL.Image
                model = genai.GenerativeModel('gemini-1.5-pro')
                img = PIL.Image.open(image_path)
                response = model.generate_content([prompt, img])
                content = response.text
            elif self.openai_client:
                response = self.openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are a table extraction expert."},
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:{mime_type};base64,{base64_image}"}
                                }
                            ]
                        }
                    ],
                    response_format={"type": "json_object"}
                )
                content = response.choices[0].message.content
            else:
                return []
            
            cleaned = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned)
            return data.get("tables", [])
            
        except Exception as e:
            print(f"Image table extraction error: {e}")
            return []
    
    async def _extract_material_metadata(self, text: str, image_paths: list, db: Session = None) -> dict:
        """
        Extract material description, manufacturer details, and standards using AI.
        """
        try:
            provider = self.get_provider(db)
            
            prompt = f"""
Extract structured information from the provided document. 
The document could be a technical datasheet, a trade license, a certification, or any construction-related document.

IMPORTANT: If 'Document Text' is empty or garbled, use the provided IMAGES for analysis. 
Analyze the visual content, stamps, signatures, and headers carefully.

1. **Document Identity & General Data** (document_data):
   - document_type: Type of document (e.g., "Trade License", "Data Sheet", "Test Report", "Material Submittal")
   - document_number: Any identification number (e.g., License No, Certificate No, Report ID)
   - issue_date: Date of issuance
   - expiry_date: Expiry date (CRITICAL for licenses/certificates/insurances)
   - entities: Entities mentioned (e.g., "NPC Dubai", "Supreme Steel", etc.)
   - general_info: A dictionary of any other important key-value pairs found in the document.

2. **Material Information** (material_info):
   - name: Material name/type
   - description: Brief technical description
   - grade: Material grade (if applicable)
   - specifications: Key technical specifications

3. **Manufacturer Information** (manufacturer_info):
   - name: Manufacturer/supplier name
   - contact: Contact information (if available)
   - certifications: Any certifications mentioned

4. **Standards**: Array of referenced standards (e.g., ["ASTM A36", "ISO 9001", "BS 5950"])

5. **Warnings & Expiry Issues** (warnings):
   - Analyze the extracted dates. If the current date is after the expiry_date, add a warning "DOCUMENT EXPIRED".
   - If expiry is within 30 days, add "EXPIRING SOON".
   - Add any other issues like "Incomplete information", "Unclear signatures", etc.
   - Return as a list of strings.

6. **Confidence Score**: A float between 0.0 and 1.0.

Return a JSON object with these exact keys: 
material_info, manufacturer_info, standards, document_data, warnings, extraction_metadata (containing confidence_score).

Current Date for Reference: {os.popen('date').read().strip()}

Document Text:
{text[:10000]}
"""
            
            content = ""
            if provider == "gemini" and self.google_key:
                model = genai.GenerativeModel('gemini-1.5-pro')
                inputs = [prompt]
                
                # Add images if provided
                if image_paths:
                    import PIL.Image
                    for path in image_paths:
                        if os.path.exists(path):
                            inputs.append(PIL.Image.open(path))
                
                response = model.generate_content(inputs)
                content = response.text
                
            elif self.openai_client:
                user_content = [{"type": "text", "text": prompt}]
                
                # Add images if provided
                for path in image_paths:
                    if os.path.exists(path):
                        with open(path, "rb") as f:
                            b64 = base64.b64encode(f.read()).decode('utf-8')
                        ext = os.path.splitext(path)[1].lower().replace('.', '')
                        mime = f"image/{ext}" if ext != 'jpg' else "image/jpeg"
                        user_content.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{b64}"}
                        })
                
                response = self.openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are a construction material data extraction expert."},
                        {"role": "user", "content": user_content}
                    ],
                    response_format={"type": "json_object"}
                )
                content = response.choices[0].message.content
            else:
                return self._create_empty_metadata()
            
            # Parse response
            cleaned = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned)
            
            # Ensure required structure
            return {
                "material_info": data.get("material_info", {}),
                "manufacturer_info": data.get("manufacturer_info", {}),
                "standards": data.get("standards", []),
                "document_data": data.get("document_data", {}),
                "warnings": data.get("warnings", []),
                "extraction_metadata": {
                    **data.get("extraction_metadata", {"confidence_score": 0.5}),
                    "provider": provider
                }
            }
            
        except Exception as e:
            print(f"Material metadata extraction error: {e}")
            return self._create_empty_metadata()
    
    def _create_empty_extraction(self, error_msg: str = "") -> dict:
        """
        Return empty extraction structure with error message.
        """
        return {
            "material_info": {},
            "manufacturer_info": {},
            "standards": [],
            "document_data": {},
            "warnings": [],
            "tables": [],
            "extraction_metadata": {
                "confidence_score": 0.0,
                "error": error_msg,
                "extraction_method": "Failed"
            }
        }
    
    def _create_empty_metadata(self) -> dict:
        """
        Return empty metadata structure.
        """
        return {
            "material_info": {},
            "manufacturer_info": {},
            "standards": [],
            "document_data": {},
            "warnings": [],
            "extraction_metadata": {
                "confidence_score": 0.0,
                "extraction_method": "AI Extraction Failed"
            }
        }

ai_service = AIService()
