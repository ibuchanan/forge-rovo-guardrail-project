import { route } from "@forge/api";
import { type CommonEvent, getAuthForEvent } from "../forge/events";
import type { RovoContext } from "../rovo/action";
import { sanitizeKey } from "./api";
import { fetchIssueSchemaFromJql, listIssuesFromJql } from "./issueSearch";

export interface PickProjectPayload extends CommonEvent {
  projectKey?: string;
  context: RovoContext; // TODO: Where are some of the places people might want an implied project key?
}

export interface RequestProject extends CommonEvent {
  projectKey: string;
  context: RovoContext;
}

export function pickProject(
  payload: PickProjectPayload,
): RequestProject | string {
  console.debug(`Request: Explicit Project Key "${payload.projectKey}"`);
  console.debug(`Request: Rovo Context "${JSON.stringify(payload.context)}"`);
  if (payload.projectKey) {
    return {
      projectKey: sanitizeKey(payload.projectKey),
      context: payload.context,
    };
  }
  // TODO: Use jmespath to extract unique project keys
  /*
  TODO: explore & fix contexts
  if (payload.context.jira.jiraContexts[0].projectKey) {
    return {
      projectKey: payload.context.jira.jiraContexts[0].projectKey,
      context: payload.context,
    };
  }
  */
  return "Could not find a Project Key in the current context";
}

export async function fetchProject(
  payload: RequestProject,
): Promise<ProjectResponse> {
  console.debug(`Request: Project Key "${payload.projectKey}"`);
  try {
    const authedApi = getAuthForEvent(payload);
    const response = await authedApi.requestJira(
      route`/rest/api/3/project/${payload.projectKey}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
    console.debug(`Response: ${response.status} ${response.statusText}`);
    // console.debug(JSON.stringify(await response.json()));
    if (response.ok) {
      console.debug(`Success: Project Key "${payload.projectKey}"`);
      const responseJson = (await response.json()) as ProjectResponse;
      console.debug(`Project: ${responseJson.key} ${responseJson.self}`);
      return responseJson;
    }
    // TODO: check status codes and throw errors
    console.error(`Failed: Project Key "${payload.projectKey}"`);
    throw new Error(`Failed for Project Key "${payload.projectKey}"\n`);
  } catch (error) {
    console.error(error);
    throw new Error(`Failed for Project Key "${payload.projectKey}"\n`);
  }
}

/*
{
  "expand": "description,lead,issueTypes,url,projectKeys,permissions,insight",
  "self": "https://api.atlassian.com/ex/jira/639c4c97-0caf-459b-bc27-da6250725163/rest/api/3/project/10011",
  "id": "10011",
  "key": "MC",
  "description": "",
  "lead": {},
  "components": [],
  "issueTypes": [],
  "assigneeType": "UNASSIGNED",
  "versions": [],
  "name": "Marketing Content",
  "roles": {},
  "avatarUrls": {},
  "projectCategory": {
    "self": "https://api.atlassian.com/ex/jira/639c4c97-0caf-459b-bc27-da6250725163/rest/api/3/projectCategory/10000",
    "id": "10000",
    "name": "One Atlassian",
    "description": "One Atlassian configured demo data project"
  },
  "projectTypeKey": "business",
  "simplified": false,
  "style": "classic",
  "isPrivate": false,
  "properties": {},
  "isLiveTemplate": false
}
*/

interface ProjectCategory {
  id: string;
  name: string;
  self: string;
  description: string;
}

export interface ProjectResponse {
  expand: string;
  id: string;
  name: string;
  self: string;
  description: string;
  key: string;
  projectCategory: ProjectCategory;
  projectTypeKey: string;
  simplified: boolean;
  style: string;
  isPrivate: boolean;
  isLiveTemplate: boolean;
}

export interface RequestIssuesForProject extends RequestProject {
  fields: Array<string>;
}

/*
Because of [JRACLOUD-9197](https://jira.atlassian.com/browse/JRACLOUD-9197)
we can't get the whole tree in 1 query,
without a lot of potential for overfetching.
And, we can't sort on hierarchy to help simplify the tree-building logic.
*/
export function listPlannedIssuesForProject(payload: RequestIssuesForProject) {
  if (payload.fields === undefined) {
    payload.fields = [];
  }
  const jql = `project = "${payload.projectKey}" AND statusCategory != "Done" ORDER BY key ASC`;
  // console.debug(`JQL: "${jql}"`);
  return {
    issues: listIssuesFromJql({
      jql: jql,
      fields: payload.fields,
      context: payload.context,
    }),
    schema: fetchIssueSchemaFromJql({
      jql: jql,
      fields: payload.fields,
      context: payload.context,
    }),
  };
}
