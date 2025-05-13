from typing import List, Any
from agentpress.tool import Tool, ToolSchema, SchemaType
from mcp import ClientSession
from mcp import Tool as McpTool


class MCPTools(Tool):
    def __init__(self, session: ClientSession):
        super().__init__()
        self._session = session

    async def initialize(self) -> None:
        self._schemas = {}
        mcp_tools = await self._list_tools()
        for mcp_tool in mcp_tools:
            self._schemas[mcp_tool.name] = [self._create_tool_schema_for_mcp_tool(mcp_tool)]

    @staticmethod
    def _create_tool_schema_for_mcp_tool(tool: McpTool) -> ToolSchema:
        return ToolSchema(
            schema_type=SchemaType.OPENAPI,
            schema={
                'type': 'function',
                'function': {
                    'name': tool.name,
                    'description': tool.description,
                    'parameters': tool.inputSchema

                }
            }
        )

    async def _list_tools(self) -> List[McpTool]:
        result = await self._session.list_tools()
        return result.tools

    def __getattribute__(self, name: str) -> Any:
        try:
            return super().__getattribute__(name)
        except AttributeError:
            async def remote_func(**kwargs):
                return await self._session.call_tool(name, arguments=kwargs)
            return remote_func
