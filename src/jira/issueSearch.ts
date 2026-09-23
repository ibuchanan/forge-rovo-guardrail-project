import { route } from "@forge/api";
import { Queue } from "elegant-queue";
import { type CommonEvent, getAuthForEvent } from "../forge/events";
import type { RovoContext } from "../rovo/action";
import type { RequestedFields, ResultIssue, Schema } from "./issue";

export interface JqlRequest extends CommonEvent {
  jql: string;
  fields: Array<string>;
  context: RovoContext;
}

/*
{
  "issues": [
    {
      "id": "10113"
    },
    {
      "expand": "renderedFields,names,schema,operations,editmeta,changelog,versionedRepresentations",
      "id": "10165",
      "self": "https://api.atlassian.com/ex/jira/639c4c97-0caf-459b-bc27-da6250725163/rest/api/3/issue/10165",
      "key": "MOBL-13",
      "fields": {}
    }
  ],
  "nextPageToken": "...",
  "isLast": false
}
*/
interface PagedSearchResponse<T> {
  issues: Array<T>;
  schema?: Record<string, Schema>;
  nextPageToken?: string | null;
  isLast: boolean;
}
const START_STATE: PagedSearchResponse<FieldsResponse> = {
  issues: [],
  nextPageToken: null,
  isLast: false,
};
type FieldsResponse = ResultIssue<RequestedFields>;
type IssueResponse = FieldsResponse;

export async function fetchIssueSchemaFromJql(
  payload: JqlRequest,
): Promise<Record<string, Schema> | undefined> {
  console.debug(`Request Schema: JQL "${payload.jql}"`);
  const authedApi = getAuthForEvent(payload);
  try {
    const response = await authedApi.requestJira(
      route`/rest/api/3/search/jql?fields=${payload.fields.join()}&expand=schema&jql=${payload.jql}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
    console.debug(`Response: ${response.status} ${response.statusText}`);
    // console.debug(JSON.stringify(await response.json()));
    if (response.ok) {
      console.debug(`Success: Schema for JQL "${payload.jql}"`);
      const responseJson =
        (await response.json()) as PagedSearchResponse<IssueResponse>;
      const schema = responseJson.schema;
      if (schema) {
        return schema;
      } else {
        console.error(`Failed: No schema in response for JQL "${payload.jql}"`);
        throw new Error(
          `Failed to get schema in response for JQL "${payload.jql}"\n`,
        );
      }
    } else {
      // TODO: check status codes and throw errors
      console.error(`Failed: Schema for JQL "${payload.jql}"`);
      throw new Error(`Failed to get schema for JQL "${payload.jql}"\n`);
    }
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to get schema for JQL "${payload.jql}"\n`);
  }
}

export async function* listIssuesFromJql(
  payload: JqlRequest,
): AsyncGenerator<IssueResponse, void, IssueResponse> {
  console.debug(`Request: JQL "${payload.jql}"`);
  const authedApi = getAuthForEvent(payload);
  const defer = new Queue<IssueResponse>();
  let responseJson = START_STATE;
  while (!responseJson.isLast) {
    try {
      const response = await authedApi.requestJira(
        route`/rest/api/3/search/jql?nextPageToken=${responseJson.nextPageToken ?? ""}&fields=${payload.fields.join()}&expand=schema&jql=${payload.jql}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );
      console.debug(`Response: ${response.status} ${response.statusText}`);
      // console.debug(JSON.stringify(await response.json()));
      if (response.ok) {
        console.debug(`Success: JQL "${payload.jql}"`);
        responseJson =
          (await response.json()) as PagedSearchResponse<IssueResponse>;
        console.debug(`Issues in this page: ${responseJson.issues.length}`);
        const issues = responseJson.issues.values();
        let issue = issues.next();
        // if (!issue.done) {
        //   defer.enqueue(yield issue.value);
        // }
        while (!issue.done) {
          const reprocess = yield issue.value;
          if (reprocess !== undefined) {
            defer.enqueue(reprocess);
          }
          issue = issues.next();
        }
      } else {
        // TODO: check status codes and throw errors
        console.error(`Failed: JQL "${payload.jql}"`);
        throw new Error(`Failed for JQL "${payload.jql}"\n`);
      }
      console.debug(`WBS: Is last page? ${responseJson.isLast}`);
      console.debug(`WBS: Deferred issues = ${defer.size()}`);
    } catch (error) {
      console.error(error);
      throw new Error(`Failed for JQL "${payload.jql}"\n`);
    }
  }
  console.debug(`WBS: peek first deferred ${JSON.stringify(defer.peek())}`);
  console.debug(`WBS: Is defer empty? ${defer.isEmpty()}`);
  // TODO: Reprocess the deferred items to build a complete tree
  while (!defer.isEmpty()) {
    try {
      const deferredWorkitem = defer.dequeue();
      console.debug(
        `WBS: deferred workitem ${JSON.stringify(deferredWorkitem)}`,
      );
      // TODO: Parents & children can have different workflow states; need to get parent if excluded from the initial search
      // const reprocess = yield deferredWorkitem;
      // if (reprocess !== undefined) {
      //   defer.enqueue(reprocess);
      // }
      console.debug(`WBS: Deferred issues = ${defer.size()}`);
    } catch (error) {
      console.error(error);
      throw new Error(
        `Failed to process deferred issues. Peek next: ${JSON.stringify(defer.peek())}\n`,
      );
    }
  }
}
