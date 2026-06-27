import asyncio
from sqlalchemy import select
from app.database import SessionLocal
from app.models.system import Organization, User

async def main():
    async with SessionLocal() as db:
        org_stmt = select(Organization)
        res = await db.execute(org_stmt)
        orgs = res.scalars().all()
        print(f"Total Organizations: {len(orgs)}")
        for o in orgs:
            print(f"- ID: {o.id}, Name: {o.name}, Slug: {o.slug}, Clerk Org ID: {o.clerk_org_id}")
            
        user_stmt = select(User).execution_options(skip_tenant_filter=True)
        res = await db.execute(user_stmt)
        users = res.scalars().all()
        print(f"Total Users: {len(users)}")
        for u in users:
            print(f"- ID: {u.id}, Clerk User ID: {u.clerk_user_id}, Email: {u.email}, Tenant ID: {u.tenant_id}, Role: {u.role}")

if __name__ == "__main__":
    asyncio.run(main())
