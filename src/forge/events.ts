import { asApp, asUser } from "@forge/api";
// import type { InstallationEvent, UpgradeEvent } from "./lifecycle";
import { truncateEvents } from "./logging";

export interface UniquelyIdentifiedObject {
  id: string;
}

export interface EventContext {
  cloudId: string; // The cloud ID.
  moduleKey: string; // The key identifying the module in the manifest
  userAccess?: { enabled: boolean };
}

export interface App extends UniquelyIdentifiedObject {
  version: string;
  name?: string;
  ownerAccountId?: string;
}

export interface CommonEvent {
  context: EventContext;
  app?: App;
  environment?: UniquelyIdentifiedObject;
  // Undocumented attributes
  eventType?: string;
  selfGenerated?: boolean;
  contextToken?: string;
}

export function getAuthForEvent(request: CommonEvent) {
  // console.debug(`auth for event: ${JSON.stringify(truncateEvents(request))}`);
  // console.debug(
  //   `auth for context: ${JSON.stringify(truncateEvents(request.context))}`,
  // );
  /*
  const impliedUser =
    (request as InstallationEvent).installerAccountId ||
    (request as UpgradeEvent).upgraderAccountId;
  console.debug(`impliedUser: ${impliedUser}`);
  if (impliedUser !== undefined) {
    // TODO: Check the scopes?
    console.debug(`auth for context: providing asUser("${impliedUser}")`);
    return asUser(impliedUser);
  }
  */
  const c = request.context as EventContext;
  // console.debug(`userAccess: ${c.userAccess?.enabled}`);
  if (c.userAccess?.enabled) {
    console.debug(`auth for context: providing asUser()`);
    return asUser();
  }
  console.debug(`auth for context: providing asApp()`);
  return asApp();
}
