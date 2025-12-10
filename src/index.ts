export { lifecycle } from "./forge/lifecycle";
export { fetchWbsContentFromProject } from "./wbs";

import type { FetchProjectWbsPayload } from "./actionpayload";
import { truncateEvents } from "./forge/logging";
import {
  buildResponse,
  type Response,
  type WebtriggerEvent,
} from "./forge/trigger";
import { fetchWbsContentFromProject } from "./wbs";

export async function trigger(req: WebtriggerEvent): Promise<Response> {
  console.debug(
    `Context token (invocation identification) for invocation of trigger: ${truncateEvents(req.contextToken)}`,
  );
  const projectRequest = JSON.parse(req.body) as FetchProjectWbsPayload;
  projectRequest.context = req.context;
  const yamlDoc = await fetchWbsContentFromProject(projectRequest);
  const res: Response = buildResponse(yamlDoc);
  // console.debug(`response: ${JSON.stringify(res)}`);
  return res;
}
