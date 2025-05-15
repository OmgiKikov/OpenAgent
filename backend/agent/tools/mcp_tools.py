import json
from typing import List, Any
from agentpress.tool import Tool, ToolSchema, SchemaType, ToolResult, xml_schema
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
                result = await self._session.call_tool(name, arguments=kwargs)
                content = json.dumps([element.model_dump(mode='json') for element in result.content])
                return ToolResult(success=not result.isError, output=json.dumps(content, ensure_ascii=False))
            return remote_func


class GoogleCalendarTool(Tool):
    def __init__(self, session: ClientSession):
        super().__init__()
        self._session = session

    @xml_schema(
        tag_name="list-calendars",
        example='''
        <!-- List all available calendars. -->
        '''
    )
    async def list_calendars(self, **kwargs) -> ToolResult:
        print(f'Run list_calendars. Tool kwargs: {kwargs}')
        result = await self._session.call_tool('list-calendars', arguments=kwargs)
        content = json.dumps([element.model_dump(mode='json') for element in result.content])
        return ToolResult(success=not result.isError, output=json.dumps(content, ensure_ascii=False))
