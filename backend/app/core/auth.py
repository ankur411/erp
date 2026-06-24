import jwt
import requests
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, List, Optional
from app.config import settings
from app.database import tenant_context, user_context

security_scheme = HTTPBearer()

# InMemory cache for JWKS keys to avoid requesting Clerk on every request
_jwks_cache: Dict = {}

def get_clerk_public_key(kid: str) -> str:
    global _jwks_cache
    if kid in _jwks_cache:
        return _jwks_cache[kid]
    
    # Fetch JWKS from Clerk
    try:
        response = requests.get(settings.CLERK_JWKS_URL, timeout=5)
        response.raise_for_status()
        jwks = response.json()
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                # Convert JWK to PEM format
                public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                _jwks_cache[kid] = public_key
                return public_key
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch JWKS keys from Clerk: {str(e)}"
        )
        
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token key identifier (kid)."
    )

class UserSession:
    def __init__(self, user_id: str, email: str, tenant_id: Optional[str] = None, role: Optional[str] = None):
        self.user_id = user_id
        self.email = email
        self.tenant_id = tenant_id
        self.role = role # Role within the organization

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security_scheme)
) -> UserSession:
    token = credentials.credentials
    try:
        # Get Key ID (kid) from token header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token header is missing key ID (kid)."
            )
        
        # Get matching public key
        public_key = get_clerk_public_key(kid)
        
        # Decode and verify token
        # Clerk JWTs contain: sub (clerk user ID), org_id (clerk organization ID), etc.
        # Note: verify audience if settings.CLERK_AUDIENCE is specified
        options = {}
        if not settings.CLERK_AUDIENCE:
            options["verify_aud"] = False
            
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=settings.CLERK_AUDIENCE or None,
            options=options
        )
        
        user_id = payload.get("sub")
        # Clerk user email might be in metadata or we sync it via clerk webhooks
        email = payload.get("email") or ""
        
        # Retrieve org_id (tenant_id)
        # Clerk provides org_id in JWT claims if user is acting in an organization context
        tenant_id = payload.get("org_id")
        
        # Clerk custom session claims can provide the user's role in the organization
        role = payload.get("org_role")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload is missing user identifier."
            )
            
        # Set database context variables
        user_context.set(user_id)
        if tenant_id:
            tenant_context.set(tenant_id)
        else:
            tenant_context.set("")
            
        return UserSession(
            user_id=user_id,
            email=email,
            tenant_id=tenant_id,
            role=role
        )
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired."
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}"
        )

# Middleware Dependencies
def require_auth(session: UserSession = Depends(get_current_user)) -> UserSession:
    return session

def require_org(session: UserSession = Depends(get_current_user)) -> UserSession:
    if not session.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization context required. Please select an organization."
        )
    return session

class RequireRole:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, session: UserSession = Depends(require_org)) -> UserSession:
        # Super admin bypasses all role checks
        if session.role == "org:admin" or "Super Admin" in self.allowed_roles:
            return session
            
        # Map Clerk default organization roles to our system roles if necessary
        # Clerk roles usually start with "org:" e.g., "org:admin", "org:member"
        # We translate user role to check compatibility
        user_role = session.role or "org:member"
        
        # Map roles
        # "Super Admin", "Organization Owner", "Procurement Manager", "Warehouse Manager", "Accountant", "HR Manager", "Employee", "Viewer"
        role_mapping = {
            "org:admin": ["Super Admin", "Organization Owner"],
            "org:member": ["Employee"],
            "org:procurement_manager": ["Procurement Manager"],
            "org:warehouse_manager": ["Warehouse Manager"],
            "org:accountant": ["Accountant"],
            "org:hr_manager": ["HR Manager"],
            "org:viewer": ["Viewer"]
        }
        
        # Check if mapped role matches allowed roles
        matched = False
        for sys_role in self.allowed_roles:
            if sys_role == "Viewer" or sys_role == "Employee":
                matched = True # Viewer/Employee is base
                break
            # Check custom mapping
            if user_role in role_mapping and sys_role in role_mapping[user_role]:
                matched = True
                break
                
        if not matched:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not allowed for role: {user_role}. Allowed roles: {self.allowed_roles}"
            )
        return session
