from sqlalchemy import event
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import get_history
from app.database import SessionLocal, tenant_context, user_context
from app.models.system import AuditLog

@event.listens_for(Session, "before_flush")
def before_flush_handler(session, flush_context, instances):
    """
    SQLAlchemy session event listener to automatically record database inserts, 
    updates, and deletes to the audit_logs table.
    """
    # Get current user and tenant from context
    uid = user_context.get()
    tid = tenant_context.get()
    
    # If no tenant context is active, we don't audit (e.g. system setup/seed/sync phase)
    if not tid:
         return

    audit_entries = []

    # Process newly created objects
    for obj in session.new:
        if isinstance(obj, AuditLog):
            continue
        
        # Capture initial values
        new_values = {}
        for column in obj.__table__.columns:
            val = getattr(obj, column.name, None)
            # Serialize datetimes or objects to string if needed; JSON handles basic types
            if val is not None:
                new_values[column.name] = str(val) if not isinstance(val, (int, float, str, bool, dict, list)) else val

        entry = AuditLog(
            tenant_id=tid,
            user_id=uid or None,
            action="CREATE",
            target_table=obj.__tablename__,
            target_id=getattr(obj, "id", None),
            new_values=new_values,
        )
        audit_entries.append(entry)

    # Process updated objects
    for obj in session.dirty:
        if isinstance(obj, AuditLog):
            continue

        old_values = {}
        new_values = {}
        
        for column in obj.__table__.columns:
            attr = getattr(obj.__class__, column.name)
            history = get_history(obj, column.name)
            
            if history.has_changes():
                # Value was modified
                if history.deleted:
                    old_val = history.deleted[0]
                    old_values[column.name] = str(old_val) if not isinstance(old_val, (int, float, str, bool, dict, list)) else old_val
                if history.added:
                    new_val = history.added[0]
                    new_values[column.name] = str(new_val) if not isinstance(new_val, (int, float, str, bool, dict, list)) else new_val

        if old_values or new_values:
            entry = AuditLog(
                tenant_id=tid,
                user_id=uid or None,
                action="UPDATE",
                target_table=obj.__tablename__,
                target_id=getattr(obj, "id", None),
                old_values=old_values,
                new_values=new_values,
            )
            audit_entries.append(entry)

    # Process deleted objects
    for obj in session.deleted:
        if isinstance(obj, AuditLog):
            continue

        old_values = {}
        for column in obj.__table__.columns:
            val = getattr(obj, column.name, None)
            if val is not None:
                old_values[column.name] = str(val) if not isinstance(val, (int, float, str, bool, dict, list)) else val

        entry = AuditLog(
            tenant_id=tid,
            user_id=uid or None,
            action="DELETE",
            target_table=obj.__tablename__,
            target_id=getattr(obj, "id", None),
            old_values=old_values,
        )
        audit_entries.append(entry)

    # Add audit log entries to the session so they are flushed together
    for entry in audit_entries:
        session.add(entry)
