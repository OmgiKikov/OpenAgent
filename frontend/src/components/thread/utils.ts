import type { ElementType } from 'react';
import {
  ArrowDown,
  FileText,
  Terminal,
  ExternalLink,
  User,
  CheckCircle,
  CircleDashed,
  FileEdit,
  Search,
  Globe,
  Code,
  MessageSquare,
  Folder,
  FileX,
  CloudUpload,
  Wrench,
  Cog,
  Network,
  FileSearch,
  FilePlus,
} from 'lucide-react';

// Flag to control whether tool result messages are rendered
export const SHOULD_RENDER_TOOL_RESULTS = false;

// Helper function to safely parse JSON strings from content/metadata
export function safeJsonParse<T>(
  jsonString: string | undefined | null,
  fallback: T,
): T {
  if (!jsonString) {
    return fallback;
  }
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    // console.warn('Failed to parse JSON string:', jsonString, e); // Optional: log errors
    return fallback;
  }
}

// Helper function to get an icon based on tool name
export const getToolIcon = (toolName: string): ElementType => {
  // Ensure we handle null/undefined toolName gracefully
  if (!toolName) return Cog;

  // Convert to lowercase for case-insensitive matching
  const normalizedName = toolName.toLowerCase();

  // Check for browser-related tools with a prefix check
  if (normalizedName.startsWith('browser-')) {
    return Globe;
  }
  switch (normalizedName) {
    // File operations
    case 'create-file':
      return FileEdit;
    case 'str-replace':
      return FileSearch;
    case 'full-file-rewrite':
      return FilePlus;
    case 'read-file':
      return FileText;

    // Shell commands
    case 'execute-command':
      return Terminal;

    // Web operations
    case 'web-search':
      return Search;
    case 'crawl-webpage':
      return Globe;

    // API and data operations
    case 'call-data-provider':
      return ExternalLink;
    case 'get-data-provider-endpoints':
      return Network;
    case 'execute-data-provider-call':
      return Network;

    // Code operations
    case 'delete-file':
      return FileX;

    // Deployment
    case 'deploy-site':
      return CloudUpload;

    // Tools and utilities
    case 'execute-code':
      return Code;

    // User interaction
    case 'ask':
      return MessageSquare;

    // Default case
    default:
      // Add logging for debugging unhandled tool types
      console.log(
        `[PAGE] Using default icon for unknown tool type: ${toolName}`,
      );
      return Wrench; // Default icon for tools
  }
};

// Helper function to extract a primary parameter from XML/arguments
export const extractPrimaryParam = (
  toolName: string,
  content: string | undefined,
): string | null => {
  if (!content) return null;

  try {
    // Handle browser tools with a prefix check
    if (toolName?.toLowerCase().startsWith('browser-')) {
      // Try to extract URL for navigation
      const urlMatch = content.match(/url=(?:"|')([^"|']+)(?:"|')/);
      if (urlMatch) return urlMatch[1];

      // For other browser operations, extract the goal or action
      const goalMatch = content.match(/goal=(?:"|')([^"|']+)(?:"|')/);
      if (goalMatch) {
        const goal = goalMatch[1];
        return goal.length > 30 ? goal.substring(0, 27) + '...' : goal;
      }

      return null;
    }

    // Special handling for XML content - extract file_path from the actual attributes
    if (content.startsWith('<') && content.includes('>')) {
      const xmlAttrs = content.match(/<[^>]+\s+([^>]+)>/);
      if (xmlAttrs && xmlAttrs[1]) {
        const attrs = xmlAttrs[1].trim();
        const filePathMatch = attrs.match(/file_path=["']([^"']+)["']/);
        if (filePathMatch) {
          return filePathMatch[1].split('/').pop() || filePathMatch[1];
        }

        // Try to get command for execute-command
        if (toolName?.toLowerCase() === 'execute-command') {
          const commandMatch = attrs.match(/(?:command|cmd)=["']([^"']+)["']/);
          if (commandMatch) {
            const cmd = commandMatch[1];
            return cmd.length > 30 ? cmd.substring(0, 27) + '...' : cmd;
          }
        }
      }
    }

    // Simple regex for common parameters - adjust as needed
    let match: RegExpMatchArray | null = null;

    switch (toolName?.toLowerCase()) {
      // File operations
      case 'create-file':
      case 'full-file-rewrite':
      case 'read-file':
      case 'delete-file':
      case 'str-replace':
        // Try to match file_path attribute
        match = content.match(/file_path=(?:"|')([^"|']+)(?:"|')/);
        // Return just the filename part
        return match ? match[1].split('/').pop() || match[1] : null;

      // Shell commands
      case 'execute-command':
        // Extract command content
        match = content.match(/command=(?:"|')([^"|']+)(?:"|')/);
        if (match) {
          const cmd = match[1];
          return cmd.length > 30 ? cmd.substring(0, 27) + '...' : cmd;
        }
        return null;

      // Web search
      case 'web-search':
        match = content.match(/query=(?:"|')([^"|']+)(?:"|')/);
        return match
          ? match[1].length > 30
            ? match[1].substring(0, 27) + '...'
            : match[1]
          : null;

      // Data provider operations
      case 'call-data-provider':
        match = content.match(/service_name=(?:"|')([^"|']+)(?:"|')/);
        const route = content.match(/route=(?:"|')([^"|']+)(?:"|')/);
        return match && route
          ? `${match[1]}/${route[1]}`
          : match
            ? match[1]
            : null;

      // Deployment
      case 'deploy-site':
        match = content.match(/site_name=(?:"|')([^"|']+)(?:"|')/);
        return match ? match[1] : null;
    }

    return null;
  } catch (e) {
    console.warn('Error parsing tool parameters:', e);
    return null;
  }
};

// Helper function to extract a primary parameter from a JSON arguments object
export const extractPrimaryParamFromJson = (
  toolName: string,
  toolArgs: any, // This is the parsed JSON object from toolCall.function.arguments
): string | null => {
  if (!toolArgs || typeof toolArgs !== 'object') return null;

  try {
    const lowerToolName = toolName?.toLowerCase();

    // Handle browser tools
    if (lowerToolName?.startsWith('browser-')) {
      if (toolArgs.url && typeof toolArgs.url === 'string') {
        return toolArgs.url;
      }
      if (toolArgs.goal && typeof toolArgs.goal === 'string') {
        const goal = toolArgs.goal;
        return goal.length > 30 ? goal.substring(0, 27) + '...' : goal;
      }
      return null;
    }

    switch (lowerToolName) {
      // File operations
      case 'create-file':
      case 'full-file-rewrite':
      case 'read-file':
      case 'delete-file':
      case 'str-replace':
        if (toolArgs.file_path && typeof toolArgs.file_path === 'string') {
          return toolArgs.file_path.split('/').pop() || toolArgs.file_path;
        }
        if (toolArgs.target_file && typeof toolArgs.target_file === 'string') {
          return toolArgs.target_file.split('/').pop() || toolArgs.target_file;
        }
        return null;

      // Shell commands
      case 'execute-command':
        if (toolArgs.command && typeof toolArgs.command === 'string') {
          const cmd = toolArgs.command;
          return cmd.length > 30 ? cmd.substring(0, 27) + '...' : cmd;
        }
        if (toolArgs.cmd && typeof toolArgs.cmd === 'string') {
          const cmd = toolArgs.cmd;
          return cmd.length > 30 ? cmd.substring(0, 27) + '...' : cmd;
        }
        return null;

      // Web search
      case 'web-search':
        if (toolArgs.query && typeof toolArgs.query === 'string') {
          const query = toolArgs.query;
          return query.length > 30 ? query.substring(0, 27) + '...' : query;
        }
        return null;

      // Data provider operations
      case 'call-data-provider':
        if (toolArgs.service_name && typeof toolArgs.service_name === 'string' && toolArgs.route && typeof toolArgs.route === 'string') {
          return `${toolArgs.service_name}/${toolArgs.route}`;
        }
        if (toolArgs.service_name && typeof toolArgs.service_name === 'string') {
          return toolArgs.service_name;
        }
        return null;

      case 'execute-data-provider-call':
        if (toolArgs.service_name && typeof toolArgs.service_name === 'string' && toolArgs.route && typeof toolArgs.route === 'string') {
          return `${toolArgs.service_name}/${toolArgs.route}`;
        }
         if (toolArgs.service && typeof toolArgs.service === 'string' && toolArgs.route && typeof toolArgs.route === 'string') {
          return `${toolArgs.service}/${toolArgs.route}`;
        }
        if (toolArgs.service_name && typeof toolArgs.service_name === 'string') {
          return toolArgs.service_name;
        }
        if (toolArgs.service && typeof toolArgs.service === 'string') {
          return toolArgs.service;
        }
        return null;

      // Deployment
      case 'deploy-site':
        if (toolArgs.site_name && typeof toolArgs.site_name === 'string') {
          return toolArgs.site_name;
        }
        return null;

      default:
        // Fallback: try to get common parameter names
        if (toolArgs.path && typeof toolArgs.path === 'string') {
          return toolArgs.path.split('/').pop() || toolArgs.path;
        }
        if (toolArgs.name && typeof toolArgs.name === 'string') {
          return toolArgs.name;
        }
        if (toolArgs.id && typeof toolArgs.id === 'string') {
          return toolArgs.id;
        }
        return null;
    }
  } catch (e) {
    console.warn('Error extracting primary parameter from JSON:', e);
    return null;
  }
};
