
import sys
import os

# Add the parent directory to sys.path so we can import app modules
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.user_tenant import User
from app.core.security import verify_password, get_password_hash

def check_and_reset_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Found {len(users)} users in the database.")
        
        common_passwords = ["password123", "password", "admin", "secret", "123456", "test", "Welcome1!", "changeme"]
        results = []
        
        for user in users:
            found_password = None
            for pwd in common_passwords:
                if verify_password(pwd, user.hashed_password):
                    found_password = pwd
                    break
            
            if found_password:
                print(f"User {user.email}: Password matches '{found_password}'")
                results.append({
                    "email": user.email,
                    "role": user.role.value,
                    "password": found_password
                })
            else:
                print(f"User {user.email}: Password NOT found in common list. Resetting to 'password123'.")
                new_hash = get_password_hash("password123")
                user.hashed_password = new_hash
                db.add(user)
                results.append({
                    "email": user.email,
                    "role": user.role.value,
                    "password": "password123"
                })
        
        db.commit()
        
        # Summary for run.md
        print("\n--- Summary for run.md ---")
        print("| Role | Email | Password |")
        print("|------|-------|----------|")
        # Sort or map roles for nice display
        role_map = {
            "super_admin": "**Super Admin**",
            "consultant_admin": "Consultant Admin",
            "consultant_engineer": "Engineer",
            "contractor": "Contractor",
            "supplier": "Supplier"
        }
        
        for r in results:
            role_display = role_map.get(r["role"], r["role"])
            print(f"| {role_display} | `{r['email']}` | `{r['password']}` |")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_and_reset_users()
