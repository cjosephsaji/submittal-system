import asyncio
from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.submittal import Submittal, Document, SubmittalStatus
from app.models.requirement import ProjectRequirement
from app.services.ai_service import ai_service
from app.utils.audit import log_submittal_event, AuditEventType
from datetime import datetime
from sqlalchemy import or_

@celery_app.task(name="app.tasks.process_submittal_task")
def process_submittal_task(submittal_id: int, project_id: int):
    """
    Celery task to process submittal using AI.
    Runs the async processing logic in a synchronous wrapper.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_run_submittal_processing(submittal_id, project_id))
    finally:
        loop.close()

async def _run_submittal_processing(submittal_id: int, project_id: int):
    db = SessionLocal()
    try:
        submittal = db.query(Submittal).filter(Submittal.id == submittal_id).first()
        if not submittal:
            print(f"Submittal {submittal_id} not found")
            return
        
        submittal.ai_processing_status = "PROCESSING"
        db.commit()
        
        # 1. Collect all documents
        docs = db.query(Document).filter(Document.submittal_id == submittal_id).all()
        
        # Log AI processing start
        log_submittal_event(
            db=db,
            submittal_id=submittal_id,
            event_type=AuditEventType.AI_PROCESSING_STARTED,
            user_id=None,
            details={
                "file_count": len(docs),
                "file_names": [doc.filename for doc in docs]
            }
        )
        
        # 2. Extract structured data from each document
        all_extracted_data = []
        all_tables = []
        aggregated_standards = set()
        
        for doc in docs:
            print(f"--- Starting extraction for: {doc.filename} ---")
            extracted = await ai_service.extract_structured_data(doc.file_path, db)
            print(f"--- Extraction finished for: {doc.filename} ---")
            all_extracted_data.append(extracted)
            
            if extracted.get("tables"):
                for table in extracted["tables"]:
                    table["source_file"] = doc.filename
                all_tables.extend(extracted.get("tables", []))
            
            if extracted.get("standards"):
                aggregated_standards.update(extracted["standards"])
        
        # 3. Combine material info and other data
        combined_material_info = {}
        combined_manufacturer_info = {}
        combined_document_data = {}
        all_warnings = []
        
        for extracted in all_extracted_data:
            if not combined_material_info and extracted.get("material_info"):
                combined_material_info = extracted["material_info"]
            if not combined_manufacturer_info and extracted.get("manufacturer_info"):
                combined_manufacturer_info = extracted["manufacturer_info"]
            if not combined_document_data and extracted.get("document_data"):
                combined_document_data = extracted["document_data"]
            
            if extracted.get("warnings"):
                all_warnings.extend(extracted["warnings"])
        
        # 4. Confidence
        confidence_scores = [
            e.get("extraction_metadata", {}).get("confidence_score", 0.0) 
            for e in all_extracted_data
        ]
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
        
        # 5. Extract text for verification
        full_text = ""
        img_paths = []
        transient_images = [] # Images rendered from PDFs to be deleted after
        for doc in docs:
            ext = doc.file_path.lower().split('.')[-1]
            if ext == 'pdf':
                extracted_text, is_poor = ai_service._extract_text(doc.file_path)
                if is_poor:
                    pdf_images = ai_service._render_pdf_to_images(doc.file_path, max_pages=3)
                    img_paths.extend(pdf_images)
                    transient_images.extend(pdf_images)
                    # Use a placeholder so AI knows to check images
                    full_text += f"\n--- Document: {doc.filename} ---\n[Garbled or missing text. Use provided visual pages.]\n"
                else:
                    full_text += f"\n--- Document: {doc.filename} ---\n{extracted_text}"
            elif ext in ['jpg', 'jpeg', 'png', 'webp']:
                img_paths.append(doc.file_path)
        
        # 6. Requirement Verification
        requirements = db.query(ProjectRequirement).filter(
            ProjectRequirement.project_id == project_id,
            or_(
                ProjectRequirement.category == submittal.category,
                ProjectRequirement.category == None,
                ProjectRequirement.category == ""
            )
        ).all()

        
        req_dicts = [{"id": r.id, "field_name": r.field_name, "description": r.description} for r in requirements]
        
        verification_results = await ai_service.verify_requirements_with_ai(
            full_text[:30000],
            req_dicts,
            image_paths=img_paths,
            db=db
        )
        
        # 7. Merge manual entries
        manual_entries = submittal.material_data.get("manual_entries", []) if submittal.material_data else []
        checklist_map = {item["requirement_id"]: item for item in verification_results if "requirement_id" in item}
        
        for entry in manual_entries:
            req_id = entry.get("requirementId")
            value = entry.get("value")
            req = next((r for r in req_dicts if r["id"] == req_id), None)
            if not req: continue

            if req_id in checklist_map:
                checklist_map[req_id].update({
                    "status": "PASSED",
                    "message": f"Supplier provided: {value}",
                    "manual_value": value
                })
            else:
                checklist_map[req_id] = {
                    "requirement_id": req_id,
                    "field_name": req["field_name"],
                    "status": "PASSED",
                    "message": f"Supplier provided: {value}",
                    "manual_value": value
                }

        final_verification_checklist = list(checklist_map.values())
        for item in verification_results:
            if "requirement_id" not in item:
                final_verification_checklist.append(item)

        final_data = {
            "material_info": combined_material_info,
            "manufacturer_info": combined_manufacturer_info,
            "standards": list(aggregated_standards),
            "document_data": combined_document_data,
            "warnings": list(set(all_warnings)), # Deduplicate warnings
            "tables": all_tables,
            "verification_checklist": final_verification_checklist,
            "manual_entries": manual_entries,
            "extraction_metadata": {
                "confidence_score": avg_confidence,
                "processed_files": len(docs),
                "extraction_timestamp": datetime.now().isoformat(),
                "has_tables": len(all_tables) > 0
            }
        }
        
        submittal.material_data = final_data
        submittal.ai_processing_status = "COMPLETED"
        db.commit()
        
        # Cleanup transient images
        for img_path in transient_images:
            try: os.remove(img_path)
            except: pass
            
        # Log completion
        passed_count = sum(1 for r in final_verification_checklist if r.get("status") == "PASSED")
        log_submittal_event(
            db=db,
            submittal_id=submittal_id,
            event_type=AuditEventType.AI_PROCESSING_COMPLETED,
            user_id=None,
            details={
                "final_confidence_score": round(avg_confidence, 2),
                "total_tables": len(all_tables),
                "requirements_passed": passed_count,
            }
        )
        
        print(f"✅ Celery Task: Submittal {submittal_id} processing COMPLETED")
        
    except Exception as e:
        print(f"❌ Celery Task Error: {e}")
        db.rollback()
        submittal = db.query(Submittal).filter(Submittal.id == submittal_id).first()
        if submittal:
            submittal.ai_processing_status = "FAILED"
            submittal.material_data = {"error": str(e)}
            db.commit()
    finally:
        # Cleanup any remaining transient images
        if 'transient_images' in locals():
            for img_path in transient_images:
                try: os.remove(img_path)
                except: pass
        db.close()
