import YAML from "yaml";
import type { FetchProjectWbsPayload } from "./actionpayload";
import {
  mapSchemaedResultToCard,
  type ResultIssue,
  type Schema,
} from "./jira/issue";
import {
  fetchProject,
  listPlannedIssuesForProject,
  type ProjectResponse,
  pickProject,
} from "./jira/project";

/*
 * **Summary** – A short description of the work item.
 * **Linked Issues** – A list of other work items that affect (or are affected by) the work item.
 * **Assignee** – The team member assigned to work on the work item
 * **Due date** – when the work item is planned to end
 */
/*
export const workitemContentFields: Array<ContentField> = [
  { name: "Issue Type", type: ContentType.Frontmatter },
  { name: "Summary", type: ContentType.Frontmatter },
  { name: "Linked Issues", type: ContentType.Frontmatter },
  { name: "Assignee", type: ContentType.Frontmatter },
  { name: "Due date", type: ContentType.Frontmatter },
  { name: "Status", type: ContentType.Frontmatter },
  { name: "Parent", type: ContentType.Frontmatter },
];
*/
const FIELDS = ["issuetype", "summary", "", "assignee", "", "status", "parent"];

type RequestedFields = Record<string, any>;

class WbsNode {
  expand: string;
  id: string;
  self: string;
  key: string;
  children: Array<WbsNode>;
  constructor(
    node: ProjectResponse | ResultIssue<RequestedFields>,
    root?: WbsRoot,
  ) {
    if (root) {
      const remapped = mapSchemaedResultToCard(
        node as ResultIssue<RequestedFields>,
        root.schema,
      );
      Object.assign(this, remapped);
    } else {
      Object.assign(this, node as ProjectResponse);
    }
    this.expand = node.expand;
    this.id = node.id;
    this.self = node.self;
    this.key = node.key;
    this.children = [];
  }
}
class WbsRoot extends WbsNode {
  index: Map<string, WbsNode>;
  schema: Record<string, Schema>;
  constructor(node: ProjectResponse, schema: Record<string, Schema>) {
    super(node);
    this.schema = schema;
    this.index = new Map<string, WbsNode>();
  }
  adopt(parent: WbsNode, child: ResultIssue<RequestedFields>) {
    const childNode = new WbsNode(child, this);
    this.index.set(child.key, childNode);
    childNode.children = [];
    parent.children.push(childNode);
  }
}

const EXTRANEOUS_COMMON_KEYS = ["expand", "self"];
const EXTRANEOUS_PROJECT_KEYS = [
  "avatarUrls",
  "components",
  "issueTypes",
  "lead",
  "properties",
  "roles",
  "versions",
];
const EXTRANEOUS_ISSUE_KEYS = ["description"];
function filterAndSortKeys(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(filterAndSortKeys);
  }
  const keys = Object.keys(obj).sort();
  const ixKey = keys.indexOf("key");
  keys.splice(ixKey, 1);
  keys.unshift("key");
  const ixChildren = keys.indexOf("children");
  keys.splice(ixChildren, 1);
  keys.push("children");
  const newObj: any = {};
  for (const key of keys) {
    if (EXTRANEOUS_COMMON_KEYS.includes(key)) {
      // skip it
    } else if (EXTRANEOUS_PROJECT_KEYS.includes(key)) {
      // skip it
    } else if (EXTRANEOUS_ISSUE_KEYS.includes(key)) {
      // skip it
    } else {
      newObj[key] = filterAndSortKeys(obj[key]);
    }
  }
  return newObj;
}

function formatWbsContent(payload: WbsRoot): string {
  const { index: _index, schema: _schema, ...simpleRoot } = payload;
  const filtered = filterAndSortKeys(simpleRoot);
  const doc = YAML.stringify(filtered);
  console.debug(`---\n ${doc} \n---\n`);
  return doc;
}

export async function fetchWbsContentFromProject(
  payload: FetchProjectWbsPayload,
) {
  console.debug(`WBS: Project Key "${payload.projectKey}"`);
  const projectKey = pickProject(payload);
  if (typeof projectKey === "string") {
    console.error(`Failed pickProject: ${projectKey}`);
    return projectKey;
  }
  const projectResult = await fetchProject(projectKey);
  console.debug(`WBS: listPlannedIssuesForProject "${projectResult.key}"`);
  const { issues, schema } = listPlannedIssuesForProject({
    projectKey: projectResult.key,
    fields: FIELDS,
    context: payload.context,
  });
  const issueSchema = await schema;
  if (issueSchema === undefined) {
    console.error(`Failed to resolve an issue schema for: ${projectKey}`);
    return `Failed to resolve an issue schema for: ${projectKey}`;
  }

  const root = new WbsRoot(projectResult, issueSchema);
  let issue = await issues.next();
  // console.debug(`WBS: first issue ${JSON.stringify(issue.value)}`);
  while (!issue.done) {
    if (typeof issue.value === "string") {
      console.error(`WBS: Failed listPlannedIssuesForProject: ${issue.value}`);
      return issue.value;
    }
    // console.debug(
    //   `WBS: ${issue.value.key} has parent ${issue.value.fields.parent.key}`,
    // );
    if ("fields" in issue.value) {
    } else {
      console.debug(`WBS: issue value ${JSON.stringify(issue.value)}`);
    }
    if (issue.value.fields.parent) {
      const parent = root.index.get(issue.value.fields.parent.key);
      if (parent) {
        console.debug(`WBS: ${parent} adopting ${issue.value.key}`);
        root.adopt(parent, issue.value);
        issue = await issues.next();
      } else {
        // Send the prior issue value back for processing later
        console.debug(`WBS: deferring ${issue.value.key}`);
        issue = await issues.next(issue.value);
      }
    } else {
      // console.debug(`WBS: root adopting ${issue.value.key}`);
      root.adopt(root, issue.value);
      issue = await issues.next();
    }
  }
  const content = formatWbsContent(root);
  return content;
}
