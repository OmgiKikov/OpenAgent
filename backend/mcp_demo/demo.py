import asyncio
import os
import logging
from dotenv import load_dotenv
from agno.agent import Agent
from agno.models.anthropic import Claude
from agno.tools.mcp import MCPTools

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


async def run_claude_with_mcp_tools():
    """
    Run a demo using Claude with MCP server tools via mcp-use library
    """
    load_dotenv()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY environment variable not set")
        raise ValueError("Missing Anthropic API key. Set the ANTHROPIC_API_KEY environment variable.")

    async with MCPTools(command=f"node /Users/v.makarenko/work/sber/google-calendar-mcp/build/index.js") as mcp_tools:
        agent = Agent(model=Claude(id="claude-3-5-sonnet-20241022"), tools=[mcp_tools])
        # print(mcp_tools)
        # await agent.aprint_response("List all my issues in Linear", stream=True)


async def main():
    """Main entry point for the demo"""
    try:
        await run_claude_with_mcp_tools()
    except Exception as e:
        logger.error(f"Error in demo: {str(e)}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
