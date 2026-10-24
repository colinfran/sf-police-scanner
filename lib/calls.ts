import { collections } from "./mongodb";
import type { Call } from "./types";

const CALL_ID_RE = /^\d{1,20}$/;

export async function getCall(id: string): Promise<Call | null> {
  if (!CALL_ID_RE.test(id)) return null;
  const { calls } = await collections();
  return calls.findOne({ id }, { projection: { _id: 0 } });
}
