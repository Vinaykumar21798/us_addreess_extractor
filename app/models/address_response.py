from typing import Any, List, Optional, Dict

from pydantic import BaseModel, Field


class AddressResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    addresses: List[Any] = Field(default_factory=list)
    stats: Optional[Dict[str, Any]] = None