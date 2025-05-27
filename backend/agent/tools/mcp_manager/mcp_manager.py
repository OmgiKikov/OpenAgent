from typing import Dict, Optional, Any, List
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.types import CallToolResult
from mcp import Tool as McpTool
import asyncio
from utils.logger import logger


class McpServerTool(McpTool):
    server_parameters: StdioServerParameters


class McpServer:
    def __init__(self, name: str, parameters: StdioServerParameters):
        self.name = name
        self.parameters = parameters
        self.tools: List[McpServerTool] = []

    async def initialize(self) -> None:
        await self.reload_tools()

    async def reload_tools(self) -> None:
        self.tools = []
        async with stdio_client(self.parameters) as (read, write):
            async with ClientSession(read, write) as mcp_session:
                result = await mcp_session.list_tools()
        for tool in result.tools:
            self.tools.append(
                McpServerTool(
                    name=tool.name,
                    description=tool.description,
                    inputSchema=tool.inputSchema,
                    server_parameters=self.parameters,
                )
            )
        logger.info(f"Successfully reloaded tools for MCP server {self.name}: {[tool.name for tool in self.tools]}")


class McpManager:
    _instance = None
    _servers: Dict[str, McpServer] = {}
    _tools: Dict[str, McpServerTool] = {}
    _lock = asyncio.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(McpManager, cls).__new__(cls)
        return cls._instance

    @classmethod
    async def get_tool(cls, name: str) -> McpServerTool:
        async with cls._lock:
            tool = cls._tools.get(name)
            if not tool:
                raise ValueError(f"Tool {name} not found")
            return tool.model_copy()

    @classmethod
    async def register_server(
        cls, name: str, command: str, args: list[str], env: Optional[Dict[str, str]] = None
    ) -> None:
        try:
            mcp_server = McpServer(name=name, parameters=StdioServerParameters(command=command, args=args, env=env))
            await mcp_server.initialize()
            async with cls._lock:
                cls._register_server(server=mcp_server)
                logger.info(f"Successfully registered MCP server: {name}")
        except Exception as e:
            logger.error(f"Failed to register MCP server {name}: {str(e)}")
            raise

    @classmethod
    async def unregister_server(cls, name: str) -> None:
        async with cls._lock:
            cls._unregister_server(name=name)

    @classmethod
    async def get_tools(cls) -> List[McpTool]:
        async with cls._lock:
            return [
                McpTool(name=tool_name, description=tool.description, inputSchema=tool.inputSchema)
                for tool_name, tool in cls._tools.items()
            ]

    @classmethod
    async def call_tool(cls, name: str, arguments: Dict[str, Any]) -> CallToolResult:
        try:
            tool = await cls.get_tool(name=name)
            if not tool:
                raise ValueError(f"Tool {name} not found")
            async with stdio_client(tool.server_parameters) as (read, write):
                async with ClientSession(read, write) as mcp_session:
                    return await mcp_session.call_tool(tool.name, arguments=arguments)
        except Exception as e:
            logger.error(f"Error calling tool {name}: {str(e)}")
            return CallToolResult(content=[], isError=True)

    @classmethod
    def _register_server(cls, server: McpServer) -> None:
        if server.name in cls._servers:
            logger.warning(f"Server {server.name} already registered. Overwriting...")
            cls._unregister_server(name=server.name)
        cls._servers[server.name] = server
        cls._register_tools(server=server)

    @classmethod
    def _unregister_server(cls, name: str) -> None:
        server = cls._servers.get(name)
        if not server:
            logger.warning(f"Server {name} not found. Skipping unregistration.")
            return
        cls._unregister_tools(server=server)
        del cls._servers[name]
        logger.info(f"Successfully unregistered MCP server: {name}")

    @staticmethod
    def _get_full_tool_name(server_name: str, tool_name: str) -> str:
        full_name = f"{server_name}-{tool_name}"
        return full_name.replace("_", "-")

    @classmethod
    def _register_tools(cls, server: McpServer) -> None:
        for tool in server.tools:
            cls._tools[cls._get_full_tool_name(server_name=server.name, tool_name=tool.name)] = tool

    @classmethod
    def _unregister_tools(cls, server: McpServer) -> None:
        for tool in server.tools:
            tool_name = cls._get_full_tool_name(server_name=server.name, tool_name=tool.name)
            if tool_name in cls._tools:
                del cls._tools[tool_name]
