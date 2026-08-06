import { toEventId, type EventID, type JsonValue } from "@unej-cms/sdk-core";

export interface CmsEvent<TPayload = JsonValue> {
  readonly id: EventID;
  readonly type: string;
  readonly payload: TPayload;
  readonly timestamp: string;
}

let counter = 0;

function generateEventId(): string {
  counter += 1;
  return `evt_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export function createEvent<TPayload>(type: string, payload: TPayload): CmsEvent<TPayload> {
  return {
    id: toEventId(generateEventId()),
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
}
