from typing import Any

from dify_plugin import ToolProvider
from dify_plugin.errors.tool import ToolProviderCredentialValidationError

from tools.client import SpicrawlError, api_key, request


class SpicrawlProvider(ToolProvider):
    def _validate_credentials(self, credentials: dict[str, Any]) -> None:
        # Lists the key's own request log: needs only a valid key (no scope) and spends no credits.
        try:
            request(api_key(credentials), "GET", "/v1/requests", params={"limit": 1}, timeout=30)
        except SpicrawlError as e:
            raise ToolProviderCredentialValidationError(str(e)) from None
