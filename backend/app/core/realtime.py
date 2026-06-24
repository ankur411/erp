import pusher
from typing import Dict, Any, Optional
from app.config import settings

_pusher_client = None

def get_pusher_client() -> Optional[pusher.Pusher]:
    """
    Initialize and return the Pusher client. Returns None if credentials are not configured.
    """
    global _pusher_client
    if _pusher_client:
        return _pusher_client

    if not all([settings.PUSHER_APP_ID, settings.PUSHER_KEY, settings.PUSHER_SECRET]):
        return None

    try:
        _pusher_client = pusher.Pusher(
            app_id=settings.PUSHER_APP_ID,
            key=settings.PUSHER_KEY,
            secret=settings.PUSHER_SECRET,
            cluster=settings.PUSHER_CLUSTER,
            ssl=True
        )
        return _pusher_client
    except Exception:
        # Avoid crashing startup if Pusher config is incorrect
        return None

def trigger_realtime_event(
    tenant_id: str,
    event_name: str,
    data: Dict[str, Any]
) -> bool:
    """
    Trigger a Pusher event on a private channel scoped to the active tenant.
    """
    client = get_pusher_client()
    if not client:
        return False
        
    try:
        channel_name = f"private-{tenant_id}"
        client.trigger(channel_name, event_name, data)
        return True
    except Exception:
        return False


