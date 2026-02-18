#!/usr/bin/env python3
"""
Script to clear all submittal data and projects from the database.
This will delete:
- All review comments
- All review cycles
- All documents
- All submittals
- All submittal indexes
- All project assignments
- All project requirements
- All project categories
- All projects
"""

import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.review import ReviewComment, ReviewCycle
from app.models.submittal import Document, Submittal, SubmittalIndex
from app.models.project import Project, ProjectAssignment
from app.models.requirement import ProjectRequirement
from app.models.category import ProjectCategory

def clear_all_data():
    """Clear all submittal and project data from the database."""
    db: Session = SessionLocal()
    
    try:
        print("Starting data deletion process...")
        
        # Delete in order of dependencies (child tables first)
        
        # 1. Review Comments (depends on review_cycles and documents)
        count = db.query(ReviewComment).count()
        if count > 0:
            db.query(ReviewComment).delete()
            print(f"✓ Deleted {count} review comments")
        
        # 2. Review Cycles (depends on submittals)
        count = db.query(ReviewCycle).count()
        if count > 0:
            db.query(ReviewCycle).delete()
            print(f"✓ Deleted {count} review cycles")
        
        # 3. Documents (depends on submittals)
        count = db.query(Document).count()
        if count > 0:
            db.query(Document).delete()
            print(f"✓ Deleted {count} documents")
        
        # 4. Submittals (depends on projects)
        count = db.query(Submittal).count()
        if count > 0:
            db.query(Submittal).delete()
            print(f"✓ Deleted {count} submittals")
        
        # 5. Submittal Indexes (depends on projects)
        count = db.query(SubmittalIndex).count()
        if count > 0:
            db.query(SubmittalIndex).delete()
            print(f"✓ Deleted {count} submittal indexes")
        
        # 6. Project Assignments (depends on projects)
        count = db.query(ProjectAssignment).count()
        if count > 0:
            db.query(ProjectAssignment).delete()
            print(f"✓ Deleted {count} project assignments")
        
        # 7. Project Requirements (depends on projects)
        count = db.query(ProjectRequirement).count()
        if count > 0:
            db.query(ProjectRequirement).delete()
            print(f"✓ Deleted {count} project requirements")
        
        # 8. Project Categories (depends on projects)
        count = db.query(ProjectCategory).count()
        if count > 0:
            db.query(ProjectCategory).delete()
            print(f"✓ Deleted {count} project categories")
        
        # 9. Projects (no dependencies)
        count = db.query(Project).count()
        if count > 0:
            db.query(Project).delete()
            print(f"✓ Deleted {count} projects")
        
        # Commit all deletions
        db.commit()
        print("\n✅ All submittal and project data has been successfully cleared!")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error occurred: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    # Confirm before deletion
    print("⚠️  WARNING: This will DELETE ALL submittals and projects from the database!")
    print("This action cannot be undone.\n")
    
    response = input("Are you sure you want to continue? (type 'yes' to confirm): ")
    
    if response.lower() == 'yes':
        clear_all_data()
    else:
        print("Operation cancelled.")
