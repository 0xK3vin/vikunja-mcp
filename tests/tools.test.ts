import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the vikunja-client module
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();
const mockGetBinary = vi.fn();

const mockClient = {
  get: mockGet,
  post: mockPost,
  put: mockPut,
  delete: mockDelete,
  getBinary: mockGetBinary,
};

vi.mock("../src/vikunja-client.js", () => ({
  getClient: () => mockClient,
  VikunjaClient: class MockVikunjaClient {},
}));

// Capture registered tools
interface ToolHandler {
  (args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
}

const registeredTools: Map<string, { schema: unknown; handler: ToolHandler }> = new Map();

// Mock the MCP SDK
vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class MockMcpServer {
    tool(name: string, _description: string, schema: unknown, handler: ToolHandler) {
      registeredTools.set(name, { schema, handler });
    }
    connect() {
      return Promise.resolve();
    }
  },
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: class MockStdioServerTransport {},
}));

// Helper to parse tool response
function parseResponse(response: { content: Array<{ type: string; text: string }> }) {
  return JSON.parse(response.content[0].text);
}

// Helper to call a tool
async function callTool(name: string, args: Record<string, unknown> = {}) {
  const tool = registeredTools.get(name);
  if (!tool) {
    throw new Error(`Tool "${name}" not found. Available tools: ${Array.from(registeredTools.keys()).join(", ")}`);
  }
  return tool.handler(args);
}

describe("MCP Tool Handlers", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    registeredTools.clear();

    // Reset and re-mock modules
    vi.resetModules();

    vi.doMock("../src/vikunja-client.js", () => ({
      getClient: () => mockClient,
      VikunjaClient: class MockVikunjaClient {},
    }));

    vi.doMock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
      McpServer: class MockMcpServer {
        tool(name: string, _description: string, schema: unknown, handler: ToolHandler) {
          registeredTools.set(name, { schema, handler });
        }
        connect() {
          return Promise.resolve();
        }
      },
    }));

    vi.doMock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
      StdioServerTransport: class MockStdioServerTransport {},
    }));

    // Import index to register tools
    await import("../src/index.js");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Ping Tool
  // ============================================================================

  describe("ping", () => {
    it("should return pong response", async () => {
      const response = await callTool("ping");
      const data = parseResponse(response);

      expect(data.status).toBe("ok");
      expect(data.message).toBe("pong");
      expect(data.timestamp).toBeDefined();
    });
  });

  // ============================================================================
  // Project Tools
  // ============================================================================

  describe("projects_list", () => {
    it("should list projects successfully", async () => {
      const mockProjects = [
        { id: 1, title: "Project 1" },
        { id: 2, title: "Project 2" },
      ];
      mockGet.mockResolvedValueOnce({
        data: mockProjects,
        pagination: { page: 1, perPage: 50, totalPages: 1, resultCount: 2 },
      });

      const response = await callTool("projects_list", {});
      const data = parseResponse(response);

      expect(mockGet).toHaveBeenCalledWith("/projects", {
        page: undefined,
        per_page: undefined,
        s: undefined,
        is_archived: undefined,
      });
      expect(data.projects).toEqual(mockProjects);
      expect(data.pagination).toBeDefined();
    });

    it("should pass query parameters", async () => {
      mockGet.mockResolvedValueOnce({ data: [], pagination: null });

      await callTool("projects_list", {
        page: 2,
        perPage: 10,
        search: "test",
        isArchived: true,
      });

      expect(mockGet).toHaveBeenCalledWith("/projects", {
        page: 2,
        per_page: 10,
        s: "test",
        is_archived: true,
      });
    });

    it("should handle errors", async () => {
      mockGet.mockRejectedValueOnce(new Error("Network error"));

      const response = await callTool("projects_list", {});
      const data = parseResponse(response);

      expect(response.isError).toBe(true);
      expect(data.error).toBe(true);
      expect(data.message).toBe("Network error");
    });
  });

  describe("projects_get", () => {
    it("should get a single project", async () => {
      const mockProject = { id: 1, title: "Test Project" };
      mockGet.mockResolvedValueOnce({ data: mockProject });

      const response = await callTool("projects_get", { projectId: 1 });
      const data = parseResponse(response);

      expect(mockGet).toHaveBeenCalledWith("/projects/1");
      expect(data).toEqual(mockProject);
    });

    it("should handle not found error", async () => {
      mockGet.mockRejectedValueOnce(new Error("Project not found"));

      const response = await callTool("projects_get", { projectId: 999 });
      const data = parseResponse(response);

      expect(response.isError).toBe(true);
      expect(data.message).toBe("Project not found");
    });
  });

  describe("projects_create", () => {
    it("should create a project", async () => {
      const mockProject = { id: 1, title: "New Project" };
      mockPut.mockResolvedValueOnce({ data: mockProject });

      const response = await callTool("projects_create", {
        title: "New Project",
        description: "A new project",
        color: "ff0000",
        parentProjectId: 5,
      });
      const data = parseResponse(response);

      expect(mockPut).toHaveBeenCalledWith("/projects", {
        title: "New Project",
        description: "A new project",
        hex_color: "ff0000",
        parent_project_id: 5,
      });
      expect(data).toEqual(mockProject);
    });

    it("should create a project with minimal params", async () => {
      mockPut.mockResolvedValueOnce({ data: { id: 1, title: "Minimal" } });

      await callTool("projects_create", { title: "Minimal" });

      expect(mockPut).toHaveBeenCalledWith("/projects", {
        title: "Minimal",
        description: undefined,
        hex_color: undefined,
        parent_project_id: undefined,
      });
    });
  });

  describe("projects_update", () => {
    it("should update a project", async () => {
      const mockProject = { id: 1, title: "Updated Project" };
      mockPost.mockResolvedValueOnce({ data: mockProject });

      const response = await callTool("projects_update", {
        projectId: 1,
        title: "Updated Project",
        isArchived: true,
        isFavorite: false,
      });
      const data = parseResponse(response);

      expect(mockPost).toHaveBeenCalledWith("/projects/1", {
        title: "Updated Project",
        is_archived: true,
        is_favorite: false,
      });
      expect(data).toEqual(mockProject);
    });

    it("should only include provided fields", async () => {
      mockPost.mockResolvedValueOnce({ data: { id: 1 } });

      await callTool("projects_update", { projectId: 1, description: "New desc" });

      expect(mockPost).toHaveBeenCalledWith("/projects/1", {
        description: "New desc",
      });
    });
  });

  describe("projects_delete", () => {
    it("should delete a project", async () => {
      mockDelete.mockResolvedValueOnce({ data: {} });

      const response = await callTool("projects_delete", { projectId: 1 });
      const data = parseResponse(response);

      expect(mockDelete).toHaveBeenCalledWith("/projects/1");
      expect(data.success).toBe(true);
      expect(data.message).toBe("Project deleted");
    });
  });

  // ============================================================================
  // Task Tools
  // ============================================================================

  describe("tasks_list", () => {
    it("should list all tasks when no projectId", async () => {
      const mockTasks = [{ id: 1, title: "Task 1" }];
      mockGet.mockResolvedValueOnce({ data: mockTasks, pagination: null });

      const response = await callTool("tasks_list", {});
      const data = parseResponse(response);

      expect(mockGet).toHaveBeenCalledWith("/tasks", expect.any(Object));
      expect(data.tasks).toEqual(mockTasks);
    });

    it("should list tasks for a specific project", async () => {
      const mockProject = { id: 1, views: [{ id: 10, title: "List" }] };
      const mockTasks = [{ id: 1, title: "Task 1" }];
      mockGet.mockResolvedValueOnce({ data: mockProject }); // First call for project
      mockGet.mockResolvedValueOnce({ data: mockTasks, pagination: null }); // Second call for tasks

      const response = await callTool("tasks_list", { projectId: 1 });
      const data = parseResponse(response);

      expect(mockGet).toHaveBeenCalledWith("/projects/1");
      expect(mockGet).toHaveBeenCalledWith(
        "/projects/1/views/10/tasks",
        expect.any(Object)
      );
      expect(data.tasks).toEqual(mockTasks);
    });

    it("should handle project with no views", async () => {
      mockGet.mockResolvedValueOnce({ data: { id: 1, views: [] } });

      const response = await callTool("tasks_list", { projectId: 1 });
      const data = parseResponse(response);

      expect(response.isError).toBe(true);
      expect(data.message).toBe("Project has no views");
    });

    it("should handle project with undefined views", async () => {
      mockGet.mockResolvedValueOnce({ data: { id: 1 } }); // views is undefined

      const response = await callTool("tasks_list", { projectId: 1 });
      const data = parseResponse(response);

      expect(response.isError).toBe(true);
      expect(data.message).toBe("Project has no views");
    });

    it("should pass query parameters for tasks", async () => {
      mockGet.mockResolvedValueOnce({ data: [] });

      await callTool("tasks_list", {
        page: 2,
        perPage: 25,
        search: "bug",
        sortBy: "priority",
        orderBy: "desc",
        filter: "done = false",
      });

      expect(mockGet).toHaveBeenCalledWith("/tasks", {
        page: 2,
        per_page: 25,
        s: "bug",
        sort_by: "priority",
        order_by: "desc",
        filter: "done = false",
      });
    });
  });

  describe("tasks_get", () => {
    it("should get a single task", async () => {
      const mockTask = { id: 1, title: "Test Task", done: false };
      mockGet.mockResolvedValueOnce({ data: mockTask });

      const response = await callTool("tasks_get", { taskId: 1 });
      const data = parseResponse(response);

      expect(mockGet).toHaveBeenCalledWith("/tasks/1");
      expect(data).toEqual(mockTask);
    });
  });

  describe("tasks_create", () => {
    it("should create a task with all options", async () => {
      const mockTask = { id: 1, title: "New Task" };
      mockPut.mockResolvedValueOnce({ data: mockTask });

      const response = await callTool("tasks_create", {
        projectId: 1,
        title: "New Task",
        description: "Task description",
        dueDate: "2024-12-31T23:59:59Z",
        startDate: "2024-12-01T00:00:00Z",
        endDate: "2024-12-31T23:59:59Z",
        priority: 3,
        done: false,
        color: "00ff00",
        percentDone: 0.5,
        assignees: [1, 2],
        labels: [3, 4],
      });
      const data = parseResponse(response);

      expect(mockPut).toHaveBeenCalledWith("/projects/1/tasks", {
        title: "New Task",
        description: "Task description",
        due_date: "2024-12-31T23:59:59Z",
        start_date: "2024-12-01T00:00:00Z",
        end_date: "2024-12-31T23:59:59Z",
        priority: 3,
        done: false,
        hex_color: "00ff00",
        percent_done: 0.5,
        assignees: [{ id: 1 }, { id: 2 }],
        labels: [{ id: 3 }, { id: 4 }],
      });
      expect(data).toEqual(mockTask);
    });

    it("should create a task with minimal params", async () => {
      mockPut.mockResolvedValueOnce({ data: { id: 1 } });

      await callTool("tasks_create", { projectId: 1, title: "Simple Task" });

      expect(mockPut).toHaveBeenCalledWith("/projects/1/tasks", {
        title: "Simple Task",
      });
    });
  });

  describe("tasks_update", () => {
    it("should update a task", async () => {
      const mockTask = { id: 1, title: "Updated Task", done: true };
      mockPost.mockResolvedValueOnce({ data: mockTask });

      const response = await callTool("tasks_update", {
        taskId: 1,
        title: "Updated Task",
        done: true,
        priority: 5,
        projectId: 2,
        isFavorite: true,
      });
      const data = parseResponse(response);

      expect(mockPost).toHaveBeenCalledWith("/tasks/1", {
        title: "Updated Task",
        done: true,
        priority: 5,
        project_id: 2,
        is_favorite: true,
      });
      expect(data).toEqual(mockTask);
    });

    it("should update task with all date fields", async () => {
      mockPost.mockResolvedValueOnce({ data: { id: 1 } });

      await callTool("tasks_update", {
        taskId: 1,
        dueDate: "2024-12-31T23:59:59Z",
        startDate: "2024-12-01T00:00:00Z",
        endDate: "2024-12-15T00:00:00Z",
        color: "ff0000",
        percentDone: 0.75,
        description: "Updated description",
      });

      expect(mockPost).toHaveBeenCalledWith("/tasks/1", {
        due_date: "2024-12-31T23:59:59Z",
        start_date: "2024-12-01T00:00:00Z",
        end_date: "2024-12-15T00:00:00Z",
        hex_color: "ff0000",
        percent_done: 0.75,
        description: "Updated description",
      });
    });
  });

  describe("tasks_delete", () => {
    it("should delete a task", async () => {
      mockDelete.mockResolvedValueOnce({ data: {} });

      const response = await callTool("tasks_delete", { taskId: 1 });
      const data = parseResponse(response);

      expect(mockDelete).toHaveBeenCalledWith("/tasks/1");
      expect(data.success).toBe(true);
      expect(data.message).toBe("Task deleted");
    });
  });

  // ============================================================================
  // Label Tools
  // ============================================================================

  describe("labels_list", () => {
    it("should list labels", async () => {
      const mockLabels = [{ id: 1, title: "Bug" }];
      mockGet.mockResolvedValueOnce({ data: mockLabels });

      const response = await callTool("labels_list", {});
      const data = parseResponse(response);

      expect(mockGet).toHaveBeenCalledWith("/labels", expect.any(Object));
      expect(data.labels).toEqual(mockLabels);
    });

    it("should pass pagination params", async () => {
      mockGet.mockResolvedValueOnce({ data: [] });

      await callTool("labels_list", { page: 2, perPage: 10, search: "bug" });

      expect(mockGet).toHaveBeenCalledWith("/labels", {
        page: 2,
        per_page: 10,
        s: "bug",
      });
    });
  });

  describe("labels_create", () => {
    it("should create a label", async () => {
      const mockLabel = { id: 1, title: "Feature" };
      mockPut.mockResolvedValueOnce({ data: mockLabel });

      const response = await callTool("labels_create", {
        title: "Feature",
        description: "New features",
        color: "0000ff",
      });
      const data = parseResponse(response);

      expect(mockPut).toHaveBeenCalledWith("/labels", {
        title: "Feature",
        description: "New features",
        hex_color: "0000ff",
      });
      expect(data).toEqual(mockLabel);
    });
  });

  describe("labels_delete", () => {
    it("should delete a label", async () => {
      mockDelete.mockResolvedValueOnce({ data: {} });

      const response = await callTool("labels_delete", { labelId: 1 });
      const data = parseResponse(response);

      expect(mockDelete).toHaveBeenCalledWith("/labels/1");
      expect(data.success).toBe(true);
    });
  });

  describe("task_labels_add", () => {
    it("should add a label to a task", async () => {
      const mockLabel = { id: 1, title: "Bug" };
      mockPut.mockResolvedValueOnce({ data: mockLabel });

      const response = await callTool("task_labels_add", { taskId: 1, labelId: 2 });
      const data = parseResponse(response);

      expect(mockPut).toHaveBeenCalledWith("/tasks/1/labels", { label_id: 2 });
      expect(data).toEqual(mockLabel);
    });
  });

  describe("task_labels_remove", () => {
    it("should remove a label from a task", async () => {
      mockDelete.mockResolvedValueOnce({ data: {} });

      const response = await callTool("task_labels_remove", { taskId: 1, labelId: 2 });
      const data = parseResponse(response);

      expect(mockDelete).toHaveBeenCalledWith("/tasks/1/labels/2");
      expect(data.success).toBe(true);
      expect(data.message).toBe("Label removed from task");
    });
  });

  // ============================================================================
  // Comment Tools
  // ============================================================================

  describe("task_attachments_list", () => {
    it("should list attachments on a task", async () => {
      const mockAttachments = [
        { id: 3, task_id: 1, file: { id: 9, name: "shot.png", mime: "image/png", size: 42 } },
      ];
      mockGet.mockResolvedValueOnce({ data: mockAttachments });

      const response = await callTool("task_attachments_list", { taskId: 1 });
      const data = parseResponse(response);

      expect(mockGet).toHaveBeenCalledWith("/tasks/1/attachments");
      expect(data.attachments).toEqual(mockAttachments);
    });
  });

  describe("task_attachment_get", () => {
    const binary = (contents: string, contentType: string) => ({
      data: { buffer: Buffer.from(contents), contentType, filename: "file" },
    });

    it("should return images inline as image content", async () => {
      mockGetBinary.mockResolvedValueOnce(binary("PNGDATA", "image/png"));

      const response = (await callTool("task_attachment_get", {
        taskId: 1,
        attachmentId: 3,
      })) as unknown as { content: Array<Record<string, string>> };

      expect(mockGetBinary).toHaveBeenCalledWith("/tasks/1/attachments/3", {
        preview_size: undefined,
      });
      expect(response.content[1]).toEqual({
        type: "image",
        data: Buffer.from("PNGDATA").toString("base64"),
        mimeType: "image/png",
      });
    });

    it("should pass previewSize to the API", async () => {
      mockGetBinary.mockResolvedValueOnce(binary("PNGDATA", "image/png"));

      await callTool("task_attachment_get", { taskId: 1, attachmentId: 3, previewSize: "md" });

      expect(mockGetBinary).toHaveBeenCalledWith("/tasks/1/attachments/3", { preview_size: "md" });
    });

    it("should return text files as text", async () => {
      mockGetBinary.mockResolvedValueOnce(binary("hello", "text/plain; charset=utf-8"));

      const response = await callTool("task_attachment_get", { taskId: 1, attachmentId: 3 });

      expect(response.content[1]).toEqual({ type: "text", text: "hello" });
    });

    it("should return other files as an embedded resource", async () => {
      mockGetBinary.mockResolvedValueOnce(binary("%PDF", "application/pdf"));

      const response = (await callTool("task_attachment_get", {
        taskId: 1,
        attachmentId: 3,
      })) as unknown as { content: Array<{ type: string; resource?: Record<string, string> }> };

      expect(response.content[1].type).toBe("resource");
      expect(response.content[1].resource).toEqual({
        uri: "vikunja://tasks/1/attachments/3",
        mimeType: "application/pdf",
        blob: Buffer.from("%PDF").toString("base64"),
      });
    });

    it("should save to disk when savePath is given", async () => {
      const { mkdtemp, readFile } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const { join } = await import("node:path");
      const dir = await mkdtemp(join(tmpdir(), "vikunja-mcp-"));
      const savePath = join(dir, "out.png");
      mockGetBinary.mockResolvedValueOnce(binary("PNGDATA", "image/png"));

      const response = await callTool("task_attachment_get", {
        taskId: 1,
        attachmentId: 3,
        savePath,
      });
      const data = parseResponse(response);

      expect(data.savedTo).toBe(savePath);
      expect(data.size).toBe(7);
      expect((await readFile(savePath)).toString()).toBe("PNGDATA");
    });

    it("should reject attachments over the inline size limit", async () => {
      mockGetBinary.mockResolvedValueOnce({
        data: { buffer: Buffer.alloc(5 * 1024 * 1024 + 1), contentType: "image/png" },
      });

      const response = await callTool("task_attachment_get", { taskId: 1, attachmentId: 3 });
      const data = parseResponse(response);

      expect(response.isError).toBe(true);
      expect(data.message).toContain("previewSize");
    });
  });

  describe("task_comments_list", () => {
    it("should list comments on a task", async () => {
      const mockComments = [{ id: 1, comment: "Test comment" }];
      mockGet.mockResolvedValueOnce({ data: mockComments });

      const response = await callTool("task_comments_list", { taskId: 1 });
      const data = parseResponse(response);

      expect(mockGet).toHaveBeenCalledWith("/tasks/1/comments");
      expect(data.comments).toEqual(mockComments);
    });
  });

  describe("task_comments_add", () => {
    it("should add a comment to a task", async () => {
      const mockComment = { id: 1, comment: "New comment" };
      mockPut.mockResolvedValueOnce({ data: mockComment });

      const response = await callTool("task_comments_add", {
        taskId: 1,
        comment: "New comment",
      });
      const data = parseResponse(response);

      expect(mockPut).toHaveBeenCalledWith("/tasks/1/comments", {
        comment: "New comment",
      });
      expect(data).toEqual(mockComment);
    });
  });

  // ============================================================================
  // Assignee Tools
  // ============================================================================

  describe("task_assignees_list", () => {
    it("should list assignees on a task", async () => {
      const mockAssignees = [{ id: 1, username: "user1" }];
      mockGet.mockResolvedValueOnce({ data: mockAssignees });

      const response = await callTool("task_assignees_list", { taskId: 1 });
      const data = parseResponse(response);

      expect(mockGet).toHaveBeenCalledWith("/tasks/1/assignees");
      expect(data.assignees).toEqual(mockAssignees);
    });
  });

  describe("task_assignees_add", () => {
    it("should add an assignee to a task", async () => {
      const mockUser = { id: 1, username: "user1" };
      mockPut.mockResolvedValueOnce({ data: mockUser });

      const response = await callTool("task_assignees_add", { taskId: 1, userId: 2 });
      const data = parseResponse(response);

      expect(mockPut).toHaveBeenCalledWith("/tasks/1/assignees", { user_id: 2 });
      expect(data).toEqual(mockUser);
    });
  });

  describe("task_assignees_remove", () => {
    it("should remove an assignee from a task", async () => {
      mockDelete.mockResolvedValueOnce({ data: {} });

      const response = await callTool("task_assignees_remove", { taskId: 1, userId: 2 });
      const data = parseResponse(response);

      expect(mockDelete).toHaveBeenCalledWith("/tasks/1/assignees/2");
      expect(data.success).toBe(true);
      expect(data.message).toBe("Assignee removed from task");
    });
  });

  // ============================================================================
  // Task Relation Tools
  // ============================================================================

  describe("task_relations_add", () => {
    it("should add a task relation", async () => {
      const mockRelation = { task_id: 1, other_task_id: 2, relation_kind: "blocking" };
      mockPut.mockResolvedValueOnce({ data: mockRelation });

      const response = await callTool("task_relations_add", {
        taskId: 1,
        otherTaskId: 2,
        relationKind: "blocking",
      });
      const data = parseResponse(response);

      expect(mockPut).toHaveBeenCalledWith("/tasks/1/relations", {
        other_task_id: 2,
        relation_kind: "blocking",
      });
      expect(data).toEqual(mockRelation);
    });
  });

  describe("task_relations_remove", () => {
    it("should remove a task relation", async () => {
      mockDelete.mockResolvedValueOnce({ data: {} });

      const response = await callTool("task_relations_remove", {
        taskId: 1,
        otherTaskId: 2,
        relationKind: "blocking",
      });
      const data = parseResponse(response);

      expect(mockDelete).toHaveBeenCalledWith("/tasks/1/relations/blocking/2");
      expect(data.success).toBe(true);
      expect(data.message).toBe("Task relation removed");
    });
  });

  // ============================================================================
  // Project View Tools
  // ============================================================================

  describe("project_views_list", () => {
    it("should list project views", async () => {
      const mockViews = [
        { id: 1, title: "List", view_kind: "list" },
        { id: 2, title: "Kanban", view_kind: "kanban" },
      ];
      mockGet.mockResolvedValueOnce({ data: mockViews });

      const response = await callTool("project_views_list", { projectId: 1 });
      const data = parseResponse(response);

      expect(mockGet).toHaveBeenCalledWith("/projects/1/views");
      expect(data.views).toEqual(mockViews);
    });
  });

  // ============================================================================
  // Bucket (Kanban) Tools
  // ============================================================================

  describe("buckets_list", () => {
    it("should list buckets for a project view", async () => {
      const mockBuckets = [
        { id: 1, title: "To Do" },
        { id: 2, title: "Done" },
      ];
      mockGet.mockResolvedValueOnce({ data: mockBuckets });

      const response = await callTool("buckets_list", { projectId: 1, viewId: 2 });
      const data = parseResponse(response);

      expect(mockGet).toHaveBeenCalledWith("/projects/1/views/2/buckets");
      expect(data.buckets).toEqual(mockBuckets);
    });
  });

  describe("buckets_create", () => {
    it("should create a bucket", async () => {
      const mockBucket = { id: 1, title: "In Progress", limit: 5 };
      mockPut.mockResolvedValueOnce({ data: mockBucket });

      const response = await callTool("buckets_create", {
        projectId: 1,
        viewId: 2,
        title: "In Progress",
        limit: 5,
      });
      const data = parseResponse(response);

      expect(mockPut).toHaveBeenCalledWith("/projects/1/views/2/buckets", {
        title: "In Progress",
        limit: 5,
      });
      expect(data).toEqual(mockBucket);
    });
  });

  describe("buckets_delete", () => {
    it("should delete a bucket", async () => {
      mockDelete.mockResolvedValueOnce({ data: {} });

      const response = await callTool("buckets_delete", {
        projectId: 1,
        viewId: 2,
        bucketId: 3,
      });
      const data = parseResponse(response);

      expect(mockDelete).toHaveBeenCalledWith("/projects/1/views/2/buckets/3");
      expect(data.success).toBe(true);
      expect(data.message).toBe("Bucket deleted");
    });
  });

  describe("task_move_to_bucket", () => {
    it("should move a task to a bucket", async () => {
      const mockTask = { id: 1, bucket_id: 3 };
      mockPost.mockResolvedValueOnce({ data: mockTask });

      const response = await callTool("task_move_to_bucket", {
        projectId: 1,
        viewId: 2,
        bucketId: 3,
        taskId: 4,
        position: 0,
      });
      const data = parseResponse(response);

      expect(mockPost).toHaveBeenCalledWith("/projects/1/views/2/buckets/3/tasks", {
        task_id: 4,
        position: 0,
      });
      expect(data).toEqual(mockTask);
    });
  });

  // ============================================================================
  // Team Tools
  // ============================================================================

  describe("teams_list", () => {
    it("should list teams", async () => {
      const mockTeams = [{ id: 1, name: "Team A" }];
      mockGet.mockResolvedValueOnce({ data: mockTeams, pagination: null });

      const response = await callTool("teams_list", { page: 1, perPage: 10, search: "Team" });
      const data = parseResponse(response);

      expect(mockGet).toHaveBeenCalledWith("/teams", {
        page: 1,
        per_page: 10,
        s: "Team",
      });
      expect(data.teams).toEqual(mockTeams);
    });
  });

  // ============================================================================
  // User Tools
  // ============================================================================

  describe("users_search", () => {
    it("should search for users", async () => {
      const mockUsers = [{ id: 1, username: "testuser" }];
      mockGet.mockResolvedValueOnce({ data: mockUsers });

      const response = await callTool("users_search", { search: "test" });
      const data = parseResponse(response);

      expect(mockGet).toHaveBeenCalledWith("/users", { s: "test" });
      expect(data.users).toEqual(mockUsers);
    });
  });

  // ============================================================================
  // Notification Tools
  // ============================================================================

  describe("notifications_list", () => {
    it("should list notifications", async () => {
      const mockNotifications = [{ id: 1, name: "Task assigned" }];
      mockGet.mockResolvedValueOnce({ data: mockNotifications, pagination: null });

      const response = await callTool("notifications_list", { page: 1, perPage: 20 });
      const data = parseResponse(response);

      expect(mockGet).toHaveBeenCalledWith("/notifications", {
        page: 1,
        per_page: 20,
      });
      expect(data.notifications).toEqual(mockNotifications);
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe("error handling", () => {
    it("should handle Error objects", async () => {
      mockGet.mockRejectedValueOnce(new Error("Something went wrong"));

      const response = await callTool("projects_list", {});
      const data = parseResponse(response);

      expect(response.isError).toBe(true);
      expect(data.error).toBe(true);
      expect(data.message).toBe("Something went wrong");
    });

    it("should handle non-Error objects", async () => {
      mockGet.mockRejectedValueOnce("String error");

      const response = await callTool("projects_list", {});
      const data = parseResponse(response);

      expect(response.isError).toBe(true);
      expect(data.message).toBe("String error");
    });

    it("should handle null error", async () => {
      mockGet.mockRejectedValueOnce(null);

      const response = await callTool("projects_list", {});
      const data = parseResponse(response);

      expect(response.isError).toBe(true);
      expect(data.message).toBe("null");
    });
  });
});
