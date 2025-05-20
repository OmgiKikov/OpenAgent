import json
from typing import Dict, Optional, List, Any, AsyncGenerator
from mcp import ClientSession
from supabase import AsyncClient

from agent.tools.message_tool import MessageTool
from agent.tools.sb_deploy_tool import SandboxDeployTool
from agent.tools.sb_expose_tool import SandboxExposeTool
from agent.tools.web_search_tool import SandboxWebSearchTool
from agent.tools.mcp_tools import MCPTools
from utils.config import config

from agentpress.thread_manager import ThreadManager
from agentpress.response_processor import ProcessorConfig
from agent.tools.sb_shell_tool import SandboxShellTool
from agent.tools.sb_files_tool import SandboxFilesTool
from agent.tools.sb_browser_tool import SandboxBrowserTool
from agent.tools.data_providers_tool import DataProvidersTool
from agent.prompt import get_system_prompt
from utils.logger import logger
from utils.auth_utils import get_account_id_from_thread
from services.billing import check_billing_status
from agent.tools.sb_vision_tool import SandboxVisionTool


async def get_database_client(thread_manager: ThreadManager):
    return await thread_manager.db.client


async def initialize_tools(
    thread_manager: ThreadManager, project_id: str, thread_id: str, mcp_session: Optional[ClientSession] = None
):
    """Initialize all tools required for agent operation."""
    await thread_manager.add_tool(SandboxShellTool, project_id=project_id, thread_manager=thread_manager)
    await thread_manager.add_tool(SandboxFilesTool, project_id=project_id, thread_manager=thread_manager)
    await thread_manager.add_tool(
        SandboxBrowserTool,
        project_id=project_id,
        thread_id=thread_id,
        thread_manager=thread_manager,
    )
    await thread_manager.add_tool(SandboxDeployTool, project_id=project_id, thread_manager=thread_manager)
    await thread_manager.add_tool(SandboxExposeTool, project_id=project_id, thread_manager=thread_manager)
    await thread_manager.add_tool(MessageTool)
    await thread_manager.add_tool(SandboxWebSearchTool, project_id=project_id, thread_manager=thread_manager)
    await thread_manager.add_tool(
        SandboxVisionTool,
        project_id=project_id,
        thread_id=thread_id,
        thread_manager=thread_manager,
    )

    if mcp_session is not None:
        await thread_manager.add_tool(MCPTools, session=mcp_session)

    if config.RAPID_API_KEY:
        await thread_manager.add_tool(DataProvidersTool)


async def get_account_id_for_thread(client: AsyncClient, thread_id: str) -> str:
    """Retrieve account ID associated with the given thread."""
    account_id = await get_account_id_from_thread(client, thread_id)
    if not account_id:
        raise ValueError("Could not determine account ID for thread")
    return account_id


async def validate_sandbox_for_project(client: AsyncClient, project_id: str) -> None:
    """Ensure sandbox exists for the specified project."""
    project = await client.table("projects").select("*").eq("project_id", project_id).execute()
    if not project.data or len(project.data) == 0:
        raise ValueError(f"Project {project_id} not found")

    project_data = project.data[0]
    sandbox_info = project_data.get("sandbox", {})
    if not sandbox_info.get("id"):
        raise ValueError(f"No sandbox found for project {project_id}")


async def retrieve_latest_message(client: AsyncClient, thread_id: str) -> Optional[Dict]:
    """Retrieve the most recent message in the thread."""
    latest_message = (
        await client.table("messages")
        .select("*")
        .eq("thread_id", thread_id)
        .in_("type", ["assistant", "tool", "user"])
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if latest_message.data and len(latest_message.data) > 0:
        return latest_message.data[0]
    return None


async def retrieve_latest_image_context_message(client: AsyncClient, thread_id: str) -> Optional[Dict]:
    """Retrieve the most recent image context message."""
    latest_image_context_message = (
        await client.table("messages")
        .select("*")
        .eq("thread_id", thread_id)
        .eq("type", "image_context")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if latest_image_context_message.data and len(latest_image_context_message.data) > 0:
        return latest_image_context_message.data[0]
    return None


async def delete_message_from_db(client: AsyncClient, message_id: str) -> None:
    """Delete a message from the database by ID."""
    await client.table("messages").delete().eq("message_id", message_id).execute()


async def retrieve_latest_browser_state_message(client: AsyncClient, thread_id: str) -> Optional[Dict]:
    """Retrieve the most recent browser state message."""
    latest_browser_state_message = (
        await client.table("messages")
        .select("*")
        .eq("thread_id", thread_id)
        .eq("type", "browser_state")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if latest_browser_state_message.data and len(latest_browser_state_message.data) > 0:
        return latest_browser_state_message.data[0]
    return None


def get_model_token_limit(model_name: str) -> Optional[int]:
    """Determine the token limit based on model name."""
    if "sonnet" in model_name.lower():
        return 64000
    elif "gpt-4" in model_name.lower():
        return 4096
    return None


async def extract_browser_state_message(client: AsyncClient, thread_id: str) -> List[Dict]:
    """Extract browser state message content."""
    content_items = []
    latest_browser_state_msg = await retrieve_latest_browser_state_message(client=client, thread_id=thread_id)

    if latest_browser_state_msg is None:
        return content_items

    try:
        browser_content = json.loads(latest_browser_state_msg["content"])
        screenshot_base64 = browser_content.get("screenshot_base64")
        browser_state_text = browser_content.copy()
        browser_state_text.pop("screenshot_base64", None)
        browser_state_text.pop("screenshot_url", None)
        browser_state_text.pop("screenshot_url_base64", None)

        if browser_state_text:
            content_items.append(
                {
                    "type": "text",
                    "text": "The following is the current state of the browser:\n"
                    f"{json.dumps(browser_state_text, indent=2)}",
                }
            )
        if screenshot_base64:
            content_items.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{screenshot_base64}",
                    },
                }
            )
        else:
            logger.warning("Browser state found but no screenshot base64 data.")

        await delete_message_from_db(client=client, message_id=latest_browser_state_msg["message_id"])
    except Exception as e:
        logger.error(f"Error parsing browser state: {e}")

    return content_items


async def extract_image_context_message(client: AsyncClient, thread_id: str) -> List[Dict]:
    """Extract image context message content."""
    content_items = []
    latest_image_context_msg = await retrieve_latest_image_context_message(client=client, thread_id=thread_id)

    if latest_image_context_msg is None:
        return content_items

    try:
        image_context_content = json.loads(latest_image_context_msg["content"])
        base64_image = image_context_content.get("base64")
        mime_type = image_context_content.get("mime_type")
        file_path = image_context_content.get("file_path", "unknown file")

        if base64_image and mime_type:
            content_items.append(
                {
                    "type": "text",
                    "text": f"Here is the image you requested to see: '{file_path}'",
                }
            )
            content_items.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{base64_image}",
                    },
                }
            )
        else:
            logger.warning(f"Image context found for '{file_path}' but missing base64 or mime_type.")

        await delete_message_from_db(client=client, message_id=latest_image_context_msg["message_id"])
    except Exception as e:
        logger.error(f"Error parsing image context: {e}")

    return content_items


async def extract_temporary_message(thread_id: str, client: AsyncClient) -> Optional[Dict]:
    """Extract temporary messages from browser state and image context."""
    temp_message_content_list = []

    # Extract browser state content
    browser_content_items = await extract_browser_state_message(client=client, thread_id=thread_id)
    temp_message_content_list.extend(browser_content_items)

    # Extract image context content
    image_content_items = await extract_image_context_message(client=client, thread_id=thread_id)
    temp_message_content_list.extend(image_content_items)

    if temp_message_content_list:
        return {"role": "user", "content": temp_message_content_list}

    return None


async def check_billing_status_for_account(client: AsyncClient, account_id: str) -> Optional[Dict[str, Any]]:
    """Check billing status for the specified account."""
    can_run, message, _ = await check_billing_status(client, account_id)
    if not can_run:
        error_msg = f"Billing limit reached: {message}"
        return {"type": "status", "status": "stopped", "message": error_msg}
    return None


async def configure_thread_manager(
    thread_id: str, project_id: str, mcp_session: Optional[ClientSession] = None
) -> ThreadManager:
    """Configure and prepare the thread manager with all required tools."""
    thread_manager = ThreadManager()

    await initialize_tools(
        thread_manager=thread_manager, project_id=project_id, thread_id=thread_id, mcp_session=mcp_session
    )

    return thread_manager


def detect_xml_tool_usage_from_chunk_content(chunk_content: Dict[str, Any]) -> Optional[str]:
    """Detect if an XML tool was used in the text"""
    text = chunk_content.get("content", "")
    if isinstance(text, str):
        if "</ask>" in text:
            return "ask"
        elif "</complete>" in text:
            return "complete"
        elif "</web-browser-takeover>" in text:
            return "web-browser-takeover"
    return None


async def get_generator_for_response(
    response: Dict[str, Any] | AsyncGenerator[Dict[str, Any], None],
) -> AsyncGenerator[Dict[str, Any], None]:
    if isinstance(response, dict):

        async def dict_to_generator():
            yield response

        response_gen = dict_to_generator()
    else:
        response_gen = response

    return response_gen


def detect_native_tool_usage_from_chunk_content(chunk_content: Dict[str, Any]) -> Optional[str]:
    tool_calls = chunk_content.get("tool_calls") or []
    for tool_call in tool_calls:
        if tool_call.get("type") == "function":
            return tool_call.get("function", {}).get("name")


async def detect_tool_usage_from_chunk(chunk: Dict[str, Any]) -> Optional[str]:
    if chunk.get("type") == "assistant" and "content" in chunk:
        try:
            chunk_content = chunk.get("content", {})
            chunk_content = chunk_content if isinstance(chunk_content, dict) else json.loads(chunk_content)
            xml_tool = detect_xml_tool_usage_from_chunk_content(chunk_content=chunk_content)
            native_tool = detect_native_tool_usage_from_chunk_content(chunk_content=chunk_content)

            if xml_tool:
                logger.info(f"Agent used XML tool: {xml_tool}")
                return xml_tool
            if native_tool:
                logger.info(f"Agent used native tool: {native_tool}")
                return native_tool
        except Exception as e:
            logger.error(f"Error processing chunk: {e}")


async def run_agent_iteration_generator(
    response: Dict[str, Any] | AsyncGenerator[Dict[str, Any], None],
) -> AsyncGenerator[Dict[str, Any], None]:
    if isinstance(response, dict) and "status" in response and response["status"] == "error":
        logger.error(f"Error response from run_thread: {response.get('message', 'Unknown error')}")
        yield response
        return

    error_detected = False
    detected_tool = None

    try:
        response_gen = await get_generator_for_response(response=response)

        async for chunk in response_gen:
            if isinstance(chunk, dict) and chunk.get("type") == "status" and chunk.get("status") == "error":
                error_detected = True

            detected_tool = await detect_tool_usage_from_chunk(chunk=chunk) or detected_tool

            yield chunk

        if error_detected:
            logger.info("Error detected in response")
            yield {"type": "status", "status": "error_detected"}
        elif detected_tool in ["ask", "complete", "web-browser-takeover"]:
            logger.info(f"Agent decided to stop with tool: {detected_tool}")
            yield {"type": "status", "status": "tool_detected", "tool": detected_tool}
    except Exception as e:
        error_msg = f"Error during response streaming: {str(e)}"
        logger.error(f"Error: {error_msg}")
        yield {"type": "status", "status": "error", "message": error_msg}


async def run_agent_iteration(
    thread_manager: ThreadManager,
    thread_id: str,
    account_id: str,
    model_name: str,
    stream: bool,
    native_max_auto_continues: int,
    enable_thinking: Optional[bool],
    reasoning_effort: Optional[str],
    enable_context_manager: bool,
) -> AsyncGenerator[Dict[str, Any], None]:
    """Run a single iteration of the agent and yield response chunks."""
    # Check billing status
    client = await get_database_client(thread_manager=thread_manager)
    billing_status = await check_billing_status_for_account(client=client, account_id=account_id)
    if billing_status:
        yield billing_status
        return

    try:
        # Make the LLM call
        response = await thread_manager.run_thread(
            thread_id=thread_id,
            system_prompt=get_system_message(),
            stream=stream,
            llm_model=model_name,
            llm_temperature=0,
            llm_max_tokens=get_model_token_limit(model_name),
            tool_choice="auto",
            max_tool_calls=1,
            temporary_message=await extract_temporary_message(thread_id=thread_id, client=client),
            processor_config=ProcessorConfig(
                xml_tool_calling=False,
                native_tool_calling=True,
                execute_tools=True,
                execute_on_stream=True,
                tool_execution_strategy="parallel",
                xml_adding_strategy="user_message",
            ),
            native_max_auto_continues=native_max_auto_continues,
            include_xml_examples=False,
            enable_thinking=enable_thinking,
            reasoning_effort=reasoning_effort,
            enable_context_manager=enable_context_manager,
        )

        async for chunk in run_agent_iteration_generator(response=response):
            yield chunk

    except Exception as e:
        error_msg = f"Error running thread: {str(e)}"
        logger.error(f"Error: {error_msg}")
        yield {"type": "status", "status": "error", "message": error_msg}


async def is_last_message_from_assistant(client: AsyncClient, thread_id: str) -> bool:
    """Check if the last message in the thread is from the assistant."""
    latest_message = await retrieve_latest_message(client=client, thread_id=thread_id)
    return latest_message is not None and latest_message.get("type") == "assistant"


def should_stop_execution(chunk: Dict[str, Any]) -> bool:
    return isinstance(chunk, dict) and chunk.get("type") == "status" and chunk.get("status") in ["error", "stopped"]


def should_stop_further_iterations(chunk: Dict[str, Any]) -> bool:
    return (
        isinstance(chunk, dict)
        and chunk.get("type") == "status"
        and chunk.get("status") in ["error_detected", "tool_detected"]
    )


def get_system_message():
    return {"role": "system", "content": get_system_prompt()}


async def run_agent(
    thread_id: str,
    project_id: str,
    stream: bool,
    thread_manager: Optional[ThreadManager] = None,
    native_max_auto_continues: int = 25,
    max_iterations: int = 100,
    model_name: str = "anthropic/claude-3-7-sonnet-latest",
    enable_thinking: Optional[bool] = False,
    reasoning_effort: Optional[str] = "low",
    enable_context_manager: bool = True,
    mcp_session: Optional[ClientSession] = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """Run the development agent with specified configuration."""
    logger.info(f"🚀 Starting agent with model: {model_name}")

    # Initialize thread manager and configuration
    thread_manager = await configure_thread_manager(thread_id=thread_id, project_id=project_id, mcp_session=mcp_session)
    client = await get_database_client(thread_manager=thread_manager)
    account_id = await get_account_id_for_thread(client=client, thread_id=thread_id)

    await validate_sandbox_for_project(client=client, project_id=project_id)

    # Run agent iterations
    iteration_count = 0
    continue_execution = True

    while continue_execution and iteration_count < max_iterations:
        iteration_count += 1
        logger.info(f"🔄 Running iteration {iteration_count} of {max_iterations}...")

        if await is_last_message_from_assistant(client=client, thread_id=thread_id):
            logger.info("Last message was from assistant, stopping execution")
            break

        async for chunk in run_agent_iteration(
            thread_manager=thread_manager,
            thread_id=thread_id,
            account_id=account_id,
            model_name=model_name,
            stream=stream,
            native_max_auto_continues=native_max_auto_continues,
            enable_thinking=enable_thinking,
            reasoning_effort=reasoning_effort,
            enable_context_manager=enable_context_manager,
        ):
            yield chunk

            if should_stop_execution(chunk):
                continue_execution = False
                break

            if should_stop_further_iterations(chunk):
                continue_execution = False
