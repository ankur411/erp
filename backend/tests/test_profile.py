import pytest
from sqlalchemy import select
from app.models.system import User, Organization
from app.core.auth import require_auth, UserSession, hash_password, verify_password
from app.main import app

@pytest.mark.asyncio
async def test_invite_user_sets_password_change_required(client, db_session):
    """
    Test that inviting a user sets password_change_required to True.
    """
    # 1. Setup mock organization
    org = Organization(name="Test Org", slug="test-org", clerk_org_id="org_test", status="active")
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    # Mock platform admin auth
    async def mock_admin_auth():
        return UserSession(
            user_id="admin_user_id",
            email="admin@test.com",
            tenant_id=None,
            role="platform_admin"
        )
    app.dependency_overrides[require_auth] = mock_admin_auth

    invite_payload = {
        "email": "profile_invited_user@test.com",
        "first_name": "Jane",
        "last_name": "Doe",
        "role": "Employee",
        "tenant_id": org.id
    }
    response = await client.post("/api/v1/system/users/invite", json=invite_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "success"

    # 3. Retrieve user from db and verify column value
    stmt = select(User).where(User.email == "profile_invited_user@test.com")
    result = await db_session.execute(stmt)
    user = result.scalars().first()
    assert user is not None
    assert user.password_change_required is True

@pytest.mark.asyncio
async def test_auth_me_returns_password_change_required(client, db_session):
    """
    Test that /auth/me returns the correct value of password_change_required.
    """
    # 1. Create a user with password_change_required = True
    user = User(
        clerk_user_id="user_change_req",
        email="change_req@test.com",
        first_name="Change",
        last_name="Req",
        role="Employee",
        password_change_required=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # Mock auth for this user
    async def mock_user_auth():
        return UserSession(
            user_id="user_change_req",
            email="change_req@test.com",
            tenant_id=None,
            role="Employee"
        )
    app.dependency_overrides[require_auth] = mock_user_auth

    # 2. Call /auth/me
    response = await client.post("/api/v1/system/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["password_change_required"] is True

@pytest.mark.asyncio
async def test_update_profile_and_force_password_change(client, db_session):
    """
    Test PUT /auth/profile endpoint:
    - Bypasses current password check on first change
    - Updates first/last name
    - Enforces current password checks on subsequent password changes
    """
    initial_pass = hash_password("temp_password")
    user = User(
        clerk_user_id="user_profile_flow",
        email="profile_flow@test.com",
        first_name="First",
        last_name="Last",
        role="Employee",
        password_hash=initial_pass,
        password_change_required=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # Mock auth for this user
    async def mock_user_auth():
        return UserSession(
            user_id="user_profile_flow",
            email="profile_flow@test.com",
            tenant_id=None,
            role="Employee"
        )
    app.dependency_overrides[require_auth] = mock_user_auth

    # 1. Update name without changing password
    profile_payload = {
        "first_name": "UpdatedFirst",
        "last_name": "UpdatedLast"
    }
    response = await client.put("/api/v1/system/auth/profile", json=profile_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "UpdatedFirst"
    assert data["last_name"] == "UpdatedLast"
    assert data["password_change_required"] is True  # Still true since password didn't change

    # 2. Force change password: should bypass current_password check
    pwd_payload = {
        "new_password": "secure_new_password"
    }
    response = await client.put("/api/v1/system/auth/profile", json=pwd_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["password_change_required"] is False

    # Verify database update
    await db_session.refresh(user)
    assert user.password_change_required is False
    assert verify_password("secure_new_password", user.password_hash)

    # 3. Subsequent password change: should require current password and fail if not provided
    pwd_payload_no_curr = {
        "new_password": "another_new_password"
    }
    response = await client.put("/api/v1/system/auth/profile", json=pwd_payload_no_curr)
    assert response.status_code == 400
    assert "Incorrect current password" in response.json()["detail"]

    # 4. Subsequent password change: fail if current password is wrong
    pwd_payload_wrong_curr = {
        "current_password": "wrong_password",
        "new_password": "another_new_password"
    }
    response = await client.put("/api/v1/system/auth/profile", json=pwd_payload_wrong_curr)
    assert response.status_code == 400
    assert "Incorrect current password" in response.json()["detail"]

    # 5. Subsequent password change: succeed with correct current password
    pwd_payload_correct = {
        "current_password": "secure_new_password",
        "new_password": "another_new_password"
    }
    response = await client.put("/api/v1/system/auth/profile", json=pwd_payload_correct)
    assert response.status_code == 200
    
    await db_session.refresh(user)
    assert verify_password("another_new_password", user.password_hash)
