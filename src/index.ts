#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { writeFile } from "node:fs/promises";
import { z } from "zod";
import { getClient } from "./vikunja-client.js";
import type {
  Project,
  Task,
  Label,
  TaskComment,
  Bucket,
  Team,
  User,
  Notification,
  TaskRelation,
  ProjectView,
  Message,
  TaskAttachment,
} from "./types.js";

// Create MCP server
const server = new McpServer({
  name: "vikunja",
  version: "1.0.0",
});

// Helper to format responses
function formatResponse(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

// Helper to format error responses
function formatError(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ error: true, message }, null, 2),
      },
    ],
    isError: true,
  };
}

// ============================================================================
// Ping Tool (for testing)
// ============================================================================

server.tool("ping", "Test if the MCP server is working", {}, async () => {
  return formatResponse({
    status: "ok",
    message: "pong",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Project Tools
// ============================================================================

server.tool(
  "projects_list",
  "List all projects the user has access to",
  {
    page: z.number().optional().describe("Page number for pagination (default: 1)"),
    perPage: z.number().optional().describe("Number of items per page (default: 50)"),
    search: z.string().optional().describe("Search projects by title"),
    isArchived: z.boolean().optional().describe("If true, also return archived projects"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.get<Project[]>("/projects", {
        page: args.page,
        per_page: args.perPage,
        s: args.search,
        is_archived: args.isArchived,
      });
      return formatResponse({ projects: response.data, pagination: response.pagination });
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "projects_get",
  "Get a single project by ID",
  {
    projectId: z.number().describe("The project ID"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.get<Project>(`/projects/${args.projectId}`);
      return formatResponse(response.data);
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "projects_create",
  "Create a new project",
  {
    title: z.string().describe("Project title (required)"),
    description: z.string().optional().describe("Project description"),
    color: z.string().optional().describe("Hex color (e.g., 'ff0000')"),
    parentProjectId: z.number().optional().describe("Parent project ID for nesting"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.put<Project>("/projects", {
        title: args.title,
        description: args.description,
        hex_color: args.color,
        parent_project_id: args.parentProjectId,
      });
      return formatResponse(response.data);
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "projects_update",
  "Update an existing project",
  {
    projectId: z.number().describe("The project ID (required)"),
    title: z.string().optional().describe("New project title"),
    description: z.string().optional().describe("New project description"),
    color: z.string().optional().describe("New hex color"),
    isArchived: z.boolean().optional().describe("Archive or unarchive the project"),
    isFavorite: z.boolean().optional().describe("Mark as favorite"),
  },
  async (args) => {
    try {
      const client = getClient();
      const body: Record<string, unknown> = {};
      if (args.title !== undefined) body.title = args.title;
      if (args.description !== undefined) body.description = args.description;
      if (args.color !== undefined) body.hex_color = args.color;
      if (args.isArchived !== undefined) body.is_archived = args.isArchived;
      if (args.isFavorite !== undefined) body.is_favorite = args.isFavorite;

      const response = await client.post<Project>(`/projects/${args.projectId}`, body);
      return formatResponse(response.data);
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "projects_delete",
  "Delete a project",
  {
    projectId: z.number().describe("The project ID to delete"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.delete<Message>(`/projects/${args.projectId}`);
      return formatResponse({ ...response.data, success: true, message: "Project deleted" });
    } catch (error) {
      return formatError(error);
    }
  }
);

// ============================================================================
// Task Tools
// ============================================================================

server.tool(
  "tasks_list",
  "List all tasks (optionally filtered by project)",
  {
    projectId: z
      .number()
      .optional()
      .describe("Filter by project ID (if not provided, returns all tasks)"),
    page: z.number().optional().describe("Page number for pagination (default: 1)"),
    perPage: z.number().optional().describe("Number of items per page (default: 50)"),
    search: z.string().optional().describe("Search tasks by text"),
    sortBy: z
      .string()
      .optional()
      .describe("Sort field: id, title, done, due_date, priority, created, updated"),
    orderBy: z.string().optional().describe("Sort order: asc or desc"),
    filter: z.string().optional().describe("Filter query (e.g., 'done = false')"),
  },
  async (args) => {
    try {
      const client = getClient();
      const query: Record<string, string | number | boolean | undefined> = {
        page: args.page,
        per_page: args.perPage,
        s: args.search,
        sort_by: args.sortBy,
        order_by: args.orderBy,
        filter: args.filter,
      };

      let response;
      if (args.projectId) {
        // Get tasks for a specific project - need to get the first view
        const projectResponse = await client.get<Project>(`/projects/${args.projectId}`);
        const project = projectResponse.data;
        const firstView = project.views?.[0];
        if (!firstView) {
          return formatError(new Error("Project has no views"));
        }
        response = await client.get<Task[]>(
          `/projects/${args.projectId}/views/${firstView.id}/tasks`,
          query
        );
      } else {
        // Get all tasks
        response = await client.get<Task[]>("/tasks", query);
      }

      return formatResponse({ tasks: response.data, pagination: response.pagination });
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "tasks_get",
  "Get a single task by ID",
  {
    taskId: z.number().describe("The task ID"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.get<Task>(`/tasks/${args.taskId}`);
      return formatResponse(response.data);
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "tasks_create",
  "Create a new task in a project",
  {
    projectId: z.number().describe("Project ID to create the task in (required)"),
    title: z.string().describe("Task title (required)"),
    description: z.string().optional().describe("Task description"),
    dueDate: z
      .string()
      .optional()
      .describe("Due date (ISO 8601 format, e.g., '2024-12-31T23:59:59Z')"),
    startDate: z.string().optional().describe("Start date (ISO 8601 format)"),
    endDate: z.string().optional().describe("End date (ISO 8601 format)"),
    priority: z.number().optional().describe("Priority level (higher = more important)"),
    done: z.boolean().optional().describe("Whether the task is completed"),
    color: z.string().optional().describe("Hex color for the task"),
    percentDone: z.number().optional().describe("Completion percentage (0-1)"),
    assignees: z.array(z.number()).optional().describe("Array of user IDs to assign"),
    labels: z.array(z.number()).optional().describe("Array of label IDs to add"),
  },
  async (args) => {
    try {
      const client = getClient();
      const body: Record<string, unknown> = {
        title: args.title,
      };
      if (args.description !== undefined) body.description = args.description;
      if (args.dueDate !== undefined) body.due_date = args.dueDate;
      if (args.startDate !== undefined) body.start_date = args.startDate;
      if (args.endDate !== undefined) body.end_date = args.endDate;
      if (args.priority !== undefined) body.priority = args.priority;
      if (args.done !== undefined) body.done = args.done;
      if (args.color !== undefined) body.hex_color = args.color;
      if (args.percentDone !== undefined) body.percent_done = args.percentDone;
      if (args.assignees !== undefined) {
        body.assignees = args.assignees.map((id: number) => ({ id }));
      }
      if (args.labels !== undefined) {
        body.labels = args.labels.map((id: number) => ({ id }));
      }

      const response = await client.put<Task>(`/projects/${args.projectId}/tasks`, body);
      return formatResponse(response.data);
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "tasks_update",
  "Update an existing task",
  {
    taskId: z.number().describe("The task ID (required)"),
    title: z.string().optional().describe("New task title"),
    description: z.string().optional().describe("New task description"),
    dueDate: z.string().optional().describe("New due date (ISO 8601 format)"),
    startDate: z.string().optional().describe("New start date (ISO 8601 format)"),
    endDate: z.string().optional().describe("New end date (ISO 8601 format)"),
    priority: z.number().optional().describe("New priority level"),
    done: z.boolean().optional().describe("Mark as done or not done"),
    color: z.string().optional().describe("New hex color"),
    percentDone: z.number().optional().describe("New completion percentage (0-1)"),
    projectId: z.number().optional().describe("Move task to a different project"),
    isFavorite: z.boolean().optional().describe("Mark as favorite"),
  },
  async (args) => {
    try {
      const client = getClient();
      const body: Record<string, unknown> = {};
      if (args.title !== undefined) body.title = args.title;
      if (args.description !== undefined) body.description = args.description;
      if (args.dueDate !== undefined) body.due_date = args.dueDate;
      if (args.startDate !== undefined) body.start_date = args.startDate;
      if (args.endDate !== undefined) body.end_date = args.endDate;
      if (args.priority !== undefined) body.priority = args.priority;
      if (args.done !== undefined) body.done = args.done;
      if (args.color !== undefined) body.hex_color = args.color;
      if (args.percentDone !== undefined) body.percent_done = args.percentDone;
      if (args.projectId !== undefined) body.project_id = args.projectId;
      if (args.isFavorite !== undefined) body.is_favorite = args.isFavorite;

      const response = await client.post<Task>(`/tasks/${args.taskId}`, body);
      return formatResponse(response.data);
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "tasks_delete",
  "Delete a task",
  {
    taskId: z.number().describe("The task ID to delete"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.delete<Message>(`/tasks/${args.taskId}`);
      return formatResponse({ ...response.data, success: true, message: "Task deleted" });
    } catch (error) {
      return formatError(error);
    }
  }
);

// ============================================================================
// Label Tools
// ============================================================================

server.tool(
  "labels_list",
  "List all labels the user has access to",
  {
    page: z.number().optional().describe("Page number for pagination"),
    perPage: z.number().optional().describe("Number of items per page"),
    search: z.string().optional().describe("Search labels by title"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.get<Label[]>("/labels", {
        page: args.page,
        per_page: args.perPage,
        s: args.search,
      });
      return formatResponse({ labels: response.data, pagination: response.pagination });
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "labels_create",
  "Create a new label",
  {
    title: z.string().describe("Label title (required)"),
    description: z.string().optional().describe("Label description"),
    color: z.string().optional().describe("Hex color (e.g., 'ff0000')"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.put<Label>("/labels", {
        title: args.title,
        description: args.description,
        hex_color: args.color,
      });
      return formatResponse(response.data);
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "labels_delete",
  "Delete a label",
  {
    labelId: z.number().describe("The label ID to delete"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.delete<Message>(`/labels/${args.labelId}`);
      return formatResponse({ ...response.data, success: true, message: "Label deleted" });
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "task_labels_add",
  "Add a label to a task",
  {
    taskId: z.number().describe("The task ID"),
    labelId: z.number().describe("The label ID to add"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.put<Label>(`/tasks/${args.taskId}/labels`, {
        label_id: args.labelId,
      });
      return formatResponse(response.data);
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "task_labels_remove",
  "Remove a label from a task",
  {
    taskId: z.number().describe("The task ID"),
    labelId: z.number().describe("The label ID to remove"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.delete<Message>(`/tasks/${args.taskId}/labels/${args.labelId}`);
      return formatResponse({
        ...response.data,
        success: true,
        message: "Label removed from task",
      });
    } catch (error) {
      return formatError(error);
    }
  }
);

// ============================================================================
// Attachment Tools
// ============================================================================

// Image types that MCP clients (and LLMs) can render inline
const INLINE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

// Largest attachment returned inline in the tool result (bytes)
const MAX_INLINE_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function isTextMime(mime: string): boolean {
  return (
    mime.startsWith("text/") ||
    ["application/json", "application/xml", "application/x-yaml", "application/yaml"].includes(mime)
  );
}

server.tool(
  "task_attachments_list",
  "List all attachments on a task (file name, MIME type, size)",
  {
    taskId: z.number().describe("The task ID"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.get<TaskAttachment[]>(`/tasks/${args.taskId}/attachments`);
      return formatResponse({ attachments: response.data });
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "task_attachment_get",
  "Download a task attachment. Images are returned inline so they can be viewed, text files as text, " +
    "other files as an embedded binary resource. Use savePath to write the file to disk instead.",
  {
    taskId: z.number().describe("The task ID"),
    attachmentId: z.number().describe("The attachment ID (from task_attachments_list)"),
    previewSize: z
      .enum(["sm", "md", "lg", "xl"])
      .optional()
      .describe(
        "For image attachments only: return a resized PNG preview instead of the original " +
          "(sm=100px, md=200px, lg=400px, xl=800px). Useful for large images or unsupported formats."
      ),
    savePath: z
      .string()
      .optional()
      .describe("Absolute file path to save the attachment to, instead of returning its content"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.getBinary(
        `/tasks/${args.taskId}/attachments/${args.attachmentId}`,
        { preview_size: args.previewSize }
      );
      const { buffer, filename } = response.data;
      const mime = response.data.contentType.split(";")[0].trim().toLowerCase();
      const meta = {
        taskId: args.taskId,
        attachmentId: args.attachmentId,
        filename,
        mime,
        size: buffer.length,
      };

      if (args.savePath) {
        await writeFile(args.savePath, buffer);
        return formatResponse({ ...meta, savedTo: args.savePath });
      }

      if (buffer.length > MAX_INLINE_ATTACHMENT_BYTES) {
        throw new Error(
          `Attachment is ${buffer.length} bytes, larger than the ${MAX_INLINE_ATTACHMENT_BYTES} byte inline limit. ` +
            "Use savePath to write it to disk" +
            (mime.startsWith("image/") ? ", or previewSize to get a smaller preview." : ".")
        );
      }

      if (INLINE_IMAGE_TYPES.has(mime)) {
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(meta, null, 2) },
            { type: "image" as const, data: buffer.toString("base64"), mimeType: mime },
          ],
        };
      }

      if (isTextMime(mime)) {
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(meta, null, 2) },
            { type: "text" as const, text: buffer.toString("utf-8") },
          ],
        };
      }

      const hint = mime.startsWith("image/")
        ? " This image format cannot be shown inline; use previewSize to get a PNG preview."
        : "";
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(meta, null, 2) + hint },
          {
            type: "resource" as const,
            resource: {
              uri: `vikunja://tasks/${args.taskId}/attachments/${args.attachmentId}`,
              mimeType: mime,
              blob: buffer.toString("base64"),
            },
          },
        ],
      };
    } catch (error) {
      return formatError(error);
    }
  }
);

// ============================================================================
// Comment Tools
// ============================================================================

server.tool(
  "task_comments_list",
  "List all comments on a task",
  {
    taskId: z.number().describe("The task ID"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.get<TaskComment[]>(`/tasks/${args.taskId}/comments`);
      return formatResponse({ comments: response.data });
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "task_comments_add",
  "Add a comment to a task",
  {
    taskId: z.number().describe("The task ID"),
    comment: z.string().describe("The comment text"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.put<TaskComment>(`/tasks/${args.taskId}/comments`, {
        comment: args.comment,
      });
      return formatResponse(response.data);
    } catch (error) {
      return formatError(error);
    }
  }
);

// ============================================================================
// Assignee Tools
// ============================================================================

server.tool(
  "task_assignees_list",
  "List all assignees on a task",
  {
    taskId: z.number().describe("The task ID"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.get<User[]>(`/tasks/${args.taskId}/assignees`);
      return formatResponse({ assignees: response.data });
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "task_assignees_add",
  "Add an assignee to a task",
  {
    taskId: z.number().describe("The task ID"),
    userId: z.number().describe("The user ID to assign"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.put<User>(`/tasks/${args.taskId}/assignees`, {
        user_id: args.userId,
      });
      return formatResponse(response.data);
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "task_assignees_remove",
  "Remove an assignee from a task",
  {
    taskId: z.number().describe("The task ID"),
    userId: z.number().describe("The user ID to remove"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.delete<Message>(
        `/tasks/${args.taskId}/assignees/${args.userId}`
      );
      return formatResponse({
        ...response.data,
        success: true,
        message: "Assignee removed from task",
      });
    } catch (error) {
      return formatError(error);
    }
  }
);

// ============================================================================
// Task Relation Tools
// ============================================================================

server.tool(
  "task_relations_add",
  "Create a relation between two tasks",
  {
    taskId: z.number().describe("The source task ID"),
    otherTaskId: z.number().describe("The target task ID"),
    relationKind: z
      .string()
      .describe(
        "Relation type: subtask, parenttask, related, duplicateof, duplicates, blocking, blocked, precedes, follows, copiedfrom, copiedto"
      ),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.put<TaskRelation>(`/tasks/${args.taskId}/relations`, {
        other_task_id: args.otherTaskId,
        relation_kind: args.relationKind,
      });
      return formatResponse(response.data);
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "task_relations_remove",
  "Remove a relation between two tasks",
  {
    taskId: z.number().describe("The source task ID"),
    otherTaskId: z.number().describe("The target task ID"),
    relationKind: z.string().describe("Relation type to remove"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.delete<Message>(
        `/tasks/${args.taskId}/relations/${args.relationKind}/${args.otherTaskId}`
      );
      return formatResponse({ ...response.data, success: true, message: "Task relation removed" });
    } catch (error) {
      return formatError(error);
    }
  }
);

// ============================================================================
// Project View Tools
// ============================================================================

server.tool(
  "project_views_list",
  "List all views for a project",
  {
    projectId: z.number().describe("The project ID"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.get<ProjectView[]>(`/projects/${args.projectId}/views`);
      return formatResponse({ views: response.data });
    } catch (error) {
      return formatError(error);
    }
  }
);

// ============================================================================
// Bucket (Kanban) Tools
// ============================================================================

server.tool(
  "buckets_list",
  "List all kanban buckets for a project view",
  {
    projectId: z.number().describe("The project ID"),
    viewId: z.number().describe("The project view ID (must be a kanban view)"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.get<Bucket[]>(
        `/projects/${args.projectId}/views/${args.viewId}/buckets`
      );
      return formatResponse({ buckets: response.data });
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "buckets_create",
  "Create a new kanban bucket",
  {
    projectId: z.number().describe("The project ID"),
    viewId: z.number().describe("The project view ID (must be a kanban view)"),
    title: z.string().describe("Bucket title"),
    limit: z.number().optional().describe("Max tasks in bucket (0 = unlimited)"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.put<Bucket>(
        `/projects/${args.projectId}/views/${args.viewId}/buckets`,
        {
          title: args.title,
          limit: args.limit,
        }
      );
      return formatResponse(response.data);
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "buckets_delete",
  "Delete a kanban bucket",
  {
    projectId: z.number().describe("The project ID"),
    viewId: z.number().describe("The project view ID"),
    bucketId: z.number().describe("The bucket ID to delete"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.delete<Message>(
        `/projects/${args.projectId}/views/${args.viewId}/buckets/${args.bucketId}`
      );
      return formatResponse({ ...response.data, success: true, message: "Bucket deleted" });
    } catch (error) {
      return formatError(error);
    }
  }
);

server.tool(
  "task_move_to_bucket",
  "Move a task to a different kanban bucket",
  {
    projectId: z.number().describe("The project ID"),
    viewId: z.number().describe("The project view ID"),
    bucketId: z.number().describe("The target bucket ID"),
    taskId: z.number().describe("The task ID to move"),
    position: z.number().optional().describe("Position within the bucket"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.post<Task>(
        `/projects/${args.projectId}/views/${args.viewId}/buckets/${args.bucketId}/tasks`,
        {
          task_id: args.taskId,
          position: args.position,
        }
      );
      return formatResponse(response.data);
    } catch (error) {
      return formatError(error);
    }
  }
);

// ============================================================================
// Team Tools
// ============================================================================

server.tool(
  "teams_list",
  "List all teams the user belongs to",
  {
    page: z.number().optional().describe("Page number for pagination"),
    perPage: z.number().optional().describe("Number of items per page"),
    search: z.string().optional().describe("Search teams by name"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.get<Team[]>("/teams", {
        page: args.page,
        per_page: args.perPage,
        s: args.search,
      });
      return formatResponse({ teams: response.data, pagination: response.pagination });
    } catch (error) {
      return formatError(error);
    }
  }
);

// ============================================================================
// User Tools
// ============================================================================

server.tool(
  "users_search",
  "Search for users by username, name, or email",
  {
    search: z.string().describe("Search term (required)"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.get<User[]>("/users", {
        s: args.search,
      });
      return formatResponse({ users: response.data });
    } catch (error) {
      return formatError(error);
    }
  }
);

// ============================================================================
// Notification Tools
// ============================================================================

server.tool(
  "notifications_list",
  "List all notifications for the current user",
  {
    page: z.number().optional().describe("Page number for pagination"),
    perPage: z.number().optional().describe("Number of items per page"),
  },
  async (args) => {
    try {
      const client = getClient();
      const response = await client.get<Notification[]>("/notifications", {
        page: args.page,
        per_page: args.perPage,
      });
      return formatResponse({ notifications: response.data, pagination: response.pagination });
    } catch (error) {
      return formatError(error);
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Vikunja MCP server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
