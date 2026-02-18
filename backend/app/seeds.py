from app.db.session import SessionLocal
from app.core.security import get_password_hash
from app.models.user_tenant import User, UserRole, Tenant
from app.models.project import Project

def seed():
    db = SessionLocal()
    try:
        # 1. Create Default Tenants
        tenant = db.query(Tenant).filter(Tenant.name == "Main Consultancy").first()
        if not tenant:
            tenant = Tenant(name="Main Consultancy", domain="consultancy.com")
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            print(f"Created Tenant: {tenant.name}")

        contractor_tenant = db.query(Tenant).filter(Tenant.name == "Mega Construction Co").first()
        if not contractor_tenant:
            contractor_tenant = Tenant(name="Mega Construction Co", domain="construction.com")
            db.add(contractor_tenant)
            db.commit()
            db.refresh(contractor_tenant)
            print(f"Created Tenant: {contractor_tenant.name}")
            
        supplier_tenant = db.query(Tenant).filter(Tenant.name == "Global Steel Supplies").first()
        if not supplier_tenant:
            supplier_tenant = Tenant(name="Global Steel Supplies", domain="steel.com")
            db.add(supplier_tenant)
            db.commit()
            db.refresh(supplier_tenant)
            print(f"Created Tenant: {supplier_tenant.name}")

        # 2. Create Users for Each Role
        password = get_password_hash("password") # Default password for all
        
        users_to_create = [
            {
                "email": "super_admin@submittal.com",
                "full_name": "Super Admin",
                "role": UserRole.SUPER_ADMIN,
                "tenant": tenant
            },
            {
                "email": "admin@consultant.com", 
                "full_name": "Consultant Admin",
                "role": UserRole.CONSULTANT_ADMIN,
                "tenant": tenant
            },
            {
                "email": "engineer@consultant.com",
                "full_name": "John Engineer",
                "role": UserRole.CONSULTANT_ENGINEER,
                "tenant": tenant
            },
            {
                "email": "user@contractor.com",
                "full_name": "Bob Contractor",
                "role": UserRole.CONTRACTOR,
                "tenant": contractor_tenant
            },
            {
                "email": "vendor@supplier.com",
                "full_name": "Alice Supplier",
                "role": UserRole.SUPPLIER,
                "tenant": supplier_tenant
            }
        ]

        for user_data in users_to_create:
            user = db.query(User).filter(User.email == user_data["email"]).first()
            if not user:
                user = User(
                    email=user_data["email"],
                    hashed_password=password,
                    full_name=user_data["full_name"],
                    role=user_data["role"],
                    is_active=True,
                    tenant_id=user_data["tenant"].id
                )
                db.add(user)
                db.commit()
                print(f"Created User: {user.email} ({user.role.value})")
            else:
                user.hashed_password = password
                db.commit()
                print(f"Updated User Password: {user.email}")

        # 3. Create a Dummy Project
        project = db.query(Project).filter(Project.name == "City Towers Refurbishment").first()
        if not project:
            project = Project(
                name="City Towers Refurbishment",
                code="CRT-2026-001",
                tenant_id=tenant.id
            )
            db.add(project)
            db.commit()
            print(f"Created Project: {project.name}")

    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Seeding database...")
    seed()
    print("Seeding complete.")
