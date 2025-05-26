import json
from typing import Any
from agentpress.tool import Tool, ToolSchema, SchemaType, ToolResult
from agent.tools.mcp_manager.mcp_manager import McpManager
from mcp import Tool as McpTool


class MCPTools(Tool):
    def __init__(self, mcp_manager: McpManager):
        super().__init__()
        self._mcp_manager = mcp_manager

    async def initialize(self) -> None:
        self._schemas = {}
        mcp_tools = await self._mcp_manager.get_tools()
        for mcp_tool in mcp_tools:
            self._schemas[mcp_tool.name] = [self._create_tool_schema_for_mcp_tool(mcp_tool)]

    @staticmethod
    def _create_tool_schema_for_mcp_tool(tool: McpTool) -> ToolSchema:
        return ToolSchema(
            schema_type=SchemaType.OPENAPI,
            schema={
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.inputSchema,
                },
            },
        )

    def __getattribute__(self, name: str) -> Any:
        try:
            return super().__getattribute__(name)
        except AttributeError:

            async def remote_func(**kwargs):
                result = await self._mcp_manager.call_tool(name, arguments=kwargs)
                content = json.dumps([element.model_dump(mode="json") for element in result.content])
                return ToolResult(
                    success=not result.isError,
                    output=json.dumps(content, ensure_ascii=False),
                )

            return remote_func
