from abc import ABC, abstractmethod
from typing import Any, Dict, List, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession

class BaseConnector(ABC):
    @abstractmethod
    async def connect(self, db: AsyncSession, tenant_id: str, config: Dict[str, Any], secrets: Dict[str, Any]) -> Dict[str, Any]:
        """Validate config/secrets, test connection, and return status/metadata."""
        pass

    @abstractmethod
    async def disconnect(self, db: AsyncSession, tenant_id: str, integration_id: str) -> None:
        """Disconnect the integration and clean up any resources/webhooks on the external service."""
        pass

    @abstractmethod
    async def test_connection(self, config: Dict[str, Any], secrets: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Test connection with the given config and credentials. Returns (success, error_message)."""
        pass

    @abstractmethod
    async def fetch_metadata(self, db: AsyncSession, tenant_id: str, integration_id: str, config: Dict[str, Any], secrets: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch metadata, such as available workflows or tables from the connector source."""
        pass

    @abstractmethod
    async def import_data(
        self, 
        db: AsyncSession, 
        tenant_id: str, 
        integration_id: str, 
        target_type: str, 
        config: Dict[str, Any],
        secrets: Dict[str, Any],
        options: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Fetch records from the connector source for the target type.
        Returns a list of raw dictionaries containing the records.
        """
        pass
