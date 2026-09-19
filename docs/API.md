# API Reference

Complete reference for all Vikunja-MCP tools.

---

## Utility Tools

### `ping`

Test if the MCP server is working and can communicate.

**Parameters:** None

**Returns:** Status message with timestamp

---

## Project Tools

### `projects_list`

List all projects the user has access to.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number for pagination (default: 1) |
| `perPage` | number | No | Number of items per page (default: 50) |
| `search` | string | No | Search projects by title |
| `isArchived` | boolean | No | If true, also return archived projects |

**Returns:** Array of projects with pagination info

---

### `projects_get`

Get a single project by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | number | Yes | The project ID |

**Returns:** Project object with full details

---

### `projects_create`

Create a new project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Project title |
| `description` | string | No | Project description |
| `color` | string | No | Hex color (e.g., 'ff0000') |
| `parentProjectId` | number | No | Parent project ID for nesting |

**Returns:** Created project object

---

### `projects_update`

Update an existing project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | number | Yes | The project ID |
| `title` | string | No | New project title |
| `description` | string | No | New project description |
| `color` | string | No | New hex color |
| `isArchived` | boolean | No | Archive or unarchive the project |
| `isFavorite` | boolean | No | Mark as favorite |

**Returns:** Updated project object

---

### `projects_delete`

Delete a project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | number | Yes | The project ID to delete |

**Returns:** Success confirmation message

---

## Task Tools

### `tasks_list`

List all tasks (optionally filtered by project).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | number | No | Filter by project ID (if not provided, returns all tasks) |
| `page` | number | No | Page number for pagination (default: 1) |
| `perPage` | number | No | Number of items per page (default: 50) |
| `search` | string | No | Search tasks by text |
| `sortBy` | string | No | Sort field: id, title, done, due_date, priority, created, updated |
| `orderBy` | string | No | Sort order: asc or desc |
| `filter` | string | No | Filter query (e.g., 'done = false') |

**Returns:** Array of tasks with pagination info

---

### `tasks_get`

Get a single task by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | number | Yes | The task ID |

**Returns:** Task object with full details

---

### `tasks_create`

Create a new task in a project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | number | Yes | Project ID to create the task in |
| `title` | string | Yes | Task title |
| `description` | string | No | Task description |
| `dueDate` | string | No | Due date (ISO 8601 format) |
| `startDate` | string | No | Start date (ISO 8601 format) |
| `endDate` | string | No | End date (ISO 8601 format) |
| `priority` | number | No | Priority level (higher = more important) |
| `done` | boolean | No | Whether the task is completed |
| `color` | string | No | Hex color for the task |
| `percentDone` | number | No | Completion percentage (0-1) |
| `assignees` | number[] | No | Array of user IDs to assign |
| `labels` | number[] | No | Array of label IDs to add |

**Returns:** Created task object

---

### `tasks_update`

Update an existing task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | number | Yes | The task ID |
| `title` | string | No | New task title |
| `description` | string | No | New task description |
| `dueDate` | string | No | New due date (ISO 8601 format) |
| `startDate` | string | No | New start date (ISO 8601 format) |
| `endDate` | string | No | New end date (ISO 8601 format) |
| `priority` | number | No | New priority level |
| `done` | boolean | No | Mark as done or not done |
| `color` | string | No | New hex color |
| `percentDone` | number | No | New completion percentage (0-1) |
| `projectId` | number | No | Move task to a different project |
| `isFavorite` | boolean | No | Mark as favorite |

**Returns:** Updated task object

---

### `tasks_delete`

Delete a task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | number | Yes | The task ID to delete |

**Returns:** Success confirmation message

---

## Label Tools

### `labels_list`

List all labels the user has access to.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number for pagination |
| `perPage` | number | No | Number of items per page |
| `search` | string | No | Search labels by title |

**Returns:** Array of labels with pagination info

---

### `labels_create`

Create a new label.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Label title |
| `description` | string | No | Label description |
| `color` | string | No | Hex color (e.g., 'ff0000') |

**Returns:** Created label object

---

### `labels_delete`

Delete a label.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `labelId` | number | Yes | The label ID to delete |

**Returns:** Success confirmation message

---

### `task_labels_add`

Add a label to a task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | number | Yes | The task ID |
| `labelId` | number | Yes | The label ID to add |

**Returns:** Label object

---

### `task_labels_remove`

Remove a label from a task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | number | Yes | The task ID |
| `labelId` | number | Yes | The label ID to remove |

**Returns:** Success confirmation message

---

## Attachment Tools

### `task_attachments_list`

List all attachments on a task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | number | Yes | The task ID |

**Returns:** Array of attachment objects (with file name, MIME type and size)

---

### `task_attachment_get`

Download a task attachment.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | number | Yes | The task ID |
| `attachmentId` | number | Yes | The attachment ID |
| `previewSize` | string | No | Images only: return a resized PNG preview (`sm`, `md`, `lg`, `xl`) |
| `savePath` | string | No | Absolute path to write the file to instead of returning it |

**Returns:** Attachment metadata, plus the content: PNG/JPEG/GIF/WebP images as inline image content, text files as text, anything else as an embedded base64 resource. Files over 5 MB must use `savePath` (or `previewSize` for images). With `savePath`, returns metadata and the saved path.

---

## Comment Tools

### `task_comments_list`

List all comments on a task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | number | Yes | The task ID |

**Returns:** Array of comment objects

---

### `task_comments_add`

Add a comment to a task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | number | Yes | The task ID |
| `comment` | string | Yes | The comment text |

**Returns:** Created comment object

---

## Assignee Tools

### `task_assignees_list`

List all assignees on a task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | number | Yes | The task ID |

**Returns:** Array of user objects

---

### `task_assignees_add`

Add an assignee to a task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | number | Yes | The task ID |
| `userId` | number | Yes | The user ID to assign |

**Returns:** User object

---

### `task_assignees_remove`

Remove an assignee from a task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | number | Yes | The task ID |
| `userId` | number | Yes | The user ID to remove |

**Returns:** Success confirmation message

---

## Task Relation Tools

### `task_relations_add`

Create a relation between two tasks.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | number | Yes | The source task ID |
| `otherTaskId` | number | Yes | The target task ID |
| `relationKind` | string | Yes | Relation type (see below) |

**Relation types:**
- `subtask` / `parenttask`
- `related`
- `duplicateof` / `duplicates`
- `blocking` / `blocked`
- `precedes` / `follows`
- `copiedfrom` / `copiedto`

**Returns:** Task relation object

---

### `task_relations_remove`

Remove a relation between two tasks.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | number | Yes | The source task ID |
| `otherTaskId` | number | Yes | The target task ID |
| `relationKind` | string | Yes | Relation type to remove |

**Returns:** Success confirmation message

---

## Project View Tools

### `project_views_list`

List all views for a project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | number | Yes | The project ID |

**Returns:** Array of project view objects

---

## Bucket (Kanban) Tools

### `buckets_list`

List all kanban buckets for a project view.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | number | Yes | The project ID |
| `viewId` | number | Yes | The project view ID (must be a kanban view) |

**Returns:** Array of bucket objects

---

### `buckets_create`

Create a new kanban bucket.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | number | Yes | The project ID |
| `viewId` | number | Yes | The project view ID (must be a kanban view) |
| `title` | string | Yes | Bucket title |
| `limit` | number | No | Max tasks in bucket (0 = unlimited) |

**Returns:** Created bucket object

---

### `buckets_delete`

Delete a kanban bucket.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | number | Yes | The project ID |
| `viewId` | number | Yes | The project view ID |
| `bucketId` | number | Yes | The bucket ID to delete |

**Returns:** Success confirmation message

---

### `task_move_to_bucket`

Move a task to a different kanban bucket.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | number | Yes | The project ID |
| `viewId` | number | Yes | The project view ID |
| `bucketId` | number | Yes | The target bucket ID |
| `taskId` | number | Yes | The task ID to move |
| `position` | number | No | Position within the bucket |

**Returns:** Updated task object

---

## Team Tools

### `teams_list`

List all teams the user belongs to.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number for pagination |
| `perPage` | number | No | Number of items per page |
| `search` | string | No | Search teams by name |

**Returns:** Array of team objects with pagination info

---

## User Tools

### `users_search`

Search for users by username, name, or email.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | Yes | Search term |

**Returns:** Array of user objects

---

## Notification Tools

### `notifications_list`

List all notifications for the current user.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number for pagination |
| `perPage` | number | No | Number of items per page |

**Returns:** Array of notification objects with pagination info
