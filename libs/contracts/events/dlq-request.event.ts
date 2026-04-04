export interface DlqListRequest {
  status?: "pending" | "replayed";
}

export interface DlqFindOneRequest {
  id: string;
}

export interface DlqUpdatePayloadRequest {
  id: string;
  payload: Record<string, unknown>;
}

export interface DlqReplayRequest {
  id: string;
}

export interface DlqEntryResponse {
  id: string;
  eventId: string | null;
  originalSubject: string;
  originalStream: string;
  originalSequence: number;
  failedConsumer: string;
  deadLetterReason: string;
  payload: unknown;
  status: "pending" | "replayed";
  deadLetteredAt: string;
  replayedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DlqReplayResponse {
  replayedTo: string;
}

export interface DlqErrorResponse {
  error: string;
  statusCode: number;
}
