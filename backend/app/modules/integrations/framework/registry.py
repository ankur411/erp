from typing import Dict, Type, Optional
from app.modules.integrations.framework.base import BaseConnector

class ConnectorRegistry:
    _registry: Dict[str, Type[BaseConnector]] = {}

    @classmethod
    def register(cls, name: str, connector_cls: Type[BaseConnector]) -> None:
        cls._registry[name.lower()] = connector_cls

    @classmethod
    def get(cls, name: str) -> Optional[BaseConnector]:
        connector_cls = cls._registry.get(name.lower())
        if connector_cls:
            return connector_cls()
        return None

    @classmethod
    def list_connectors(cls) -> list[str]:
        return list(cls._registry.keys())
