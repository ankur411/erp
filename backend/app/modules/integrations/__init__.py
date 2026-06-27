# Initialize the integrations package and register connectors
from app.modules.integrations.framework.registry import ConnectorRegistry
from app.modules.integrations.framework.n8n import N8NConnector

__all__ = ["ConnectorRegistry", "N8NConnector"]
