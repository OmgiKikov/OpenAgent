import React from 'react';
import { ToolViewProps } from './types';
import { formatTimestamp, getToolTitle } from './utils';
import { getToolIcon } from '../utils';
import { CircleDashed, CheckCircle, AlertTriangle } from 'lucide-react';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import { AppleCardLoader } from './AppleCardLoader';

export function GenericToolView({
  name = 'unknown',
  assistantContent,
  toolContent,
  isSuccess = true,
  isStreaming = false,
  assistantTimestamp,
  toolTimestamp,
}: ToolViewProps) {
  console.log('GenericToolView:', {
    name,
    assistantContent,
    toolContent,
    isSuccess,
    isStreaming,
    assistantTimestamp,
    toolTimestamp,
  });

  const toolTitle = getToolTitle(name);
  // const Icon = getToolIcon(name); // Icon is not used in the new layout with AppleCardLoader primarily

  const formatContent = (content: string | null) => {
    if (!content) return null;
    try {
      const parsedJson = JSON.parse(content);
      return JSON.stringify(parsedJson, null, 2);
    } catch (e) {
      return content;
    }
  };

  const formattedAssistantContent = React.useMemo(
    () => formatContent(assistantContent),
    [assistantContent],
  );
  const formattedToolContent = React.useMemo(
    () => formatContent(toolContent),
    [toolContent],
  );

  const getAccentColor = (toolName: string) => {
    // if (toolName.toLowerCase().includes('search')) return '#ff9f0a';
    // if (toolName.toLowerCase().includes('code')) return '#30d158';
    return '#0071e3'; // Default Apple blue
  };
  const accentColor = getAccentColor(toolTitle);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 overflow-auto">
        {/* Assistant Content (Input) - shown only on error and if available */}
        {assistantContent && !isStreaming && !isSuccess && (
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between items-center">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Input
              </div>
              {assistantTimestamp && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatTimestamp(assistantTimestamp)}
                </div>
              )}
            </div>
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3">
              <Markdown className="text-xs text-zinc-800 dark:text-zinc-300">
                {formattedAssistantContent}
              </Markdown>
            </div>
          </div>
        )}

        {/* Tool Execution / Result Display */}
        {isStreaming && (
          // Tool is actively processing
          <div className="mt-4">
            <AppleCardLoader
              isProcessing={true}
              toolName={toolTitle}
              accentColor={accentColor}
              processingTime={4000} // Default, can be customized
            />
          </div>
        )}

        {!isStreaming && isSuccess && (
          // Tool finished successfully -> Show AppleCardLoader in 'complete' state
          // Raw 'toolContent' (JSON output) is NOT shown here to keep the view clean.
          <div className="mt-4">
            <AppleCardLoader
              isProcessing={false}
              toolName={toolTitle}
              accentColor={accentColor}
            />
          </div>
        )}

        {!isStreaming && !isSuccess && (
          // Tool execution failed
          <div className="space-y-1.5 mt-4">
            <div className="flex justify-between items-center">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Error
              </div>
              {toolTimestamp && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatTimestamp(toolTimestamp)}
                </div>
              )}
            </div>
            <div
              className={cn(
                'rounded-md border p-3',
                'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10',
              )}
            >
              <Markdown className="text-xs text-zinc-800 dark:text-zinc-300">
                {formattedToolContent || "Execution failed with no specific output."}
              </Markdown>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          {!isStreaming && (
            <div className="flex items-center gap-2">
              {isSuccess ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              )}
              <span>
                {isSuccess ? 'Completed successfully' : 'Execution failed'}
              </span>
            </div>
          )}

          {isStreaming && (
            <div className="flex items-center gap-2">
              <CircleDashed className="h-3.5 w-3.5 text-blue-500 animate-spin" />
              <span>Processing...</span>
            </div>
          )}

          <div className="text-xs">
            {toolTimestamp && !isStreaming
              ? formatTimestamp(toolTimestamp)
              : assistantTimestamp
                ? formatTimestamp(assistantTimestamp)
                : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
