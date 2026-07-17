from abc import ABC, abstractmethod
from typing import Any


class BaseAgent(ABC):
    name: str = "base"

    @abstractmethod
    async def process(self, context: dict[str, Any]) -> dict[str, Any]:
        pass
