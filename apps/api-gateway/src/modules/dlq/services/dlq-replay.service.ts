import { Injectable, Logger, HttpException } from "@nestjs/common";
import { JSONCodec } from "nats";
import { JetStreamService } from "@libs/messaging/jetstream.service";
import { SUBJECTS } from "@libs/contracts/subjects";
import {
  DlqEntryResponse,
  DlqReplayResponse,
  DlqErrorResponse,
} from "@libs/contracts/events/dlq-request.event";

const REQUEST_TIMEOUT_MS = 5000;

@Injectable()
export class DlqReplayService {
  private readonly logger = new Logger(DlqReplayService.name);
  private readonly json = JSONCodec();

  constructor(private readonly jetStreamService: JetStreamService) {}

  async findAll(status?: "pending" | "replayed"): Promise<DlqEntryResponse[]> {
    return this.request<DlqEntryResponse[]>(SUBJECTS.DLQ_RPC_LIST, { status });
  }

  async findOne(id: string): Promise<DlqEntryResponse> {
    return this.request<DlqEntryResponse>(SUBJECTS.DLQ_RPC_FIND_ONE, { id });
  }

  async updatePayload(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<DlqEntryResponse> {
    return this.request<DlqEntryResponse>(SUBJECTS.DLQ_RPC_UPDATE_PAYLOAD, { id, payload });
  }

  async replay(id: string): Promise<DlqReplayResponse> {
    return this.request<DlqReplayResponse>(SUBJECTS.DLQ_RPC_REPLAY, { id });
  }

  private async request<T>(subject: string, data: unknown): Promise<T> {
    const nc = this.jetStreamService.getConnection();
    const msg = await nc.request(subject, this.json.encode(data), {
      timeout: REQUEST_TIMEOUT_MS,
    });

    const response = this.json.decode(msg.data) as T | DlqErrorResponse;

    if (this.isErrorResponse(response)) {
      throw new HttpException(response.error, response.statusCode);
    }

    return response as T;
  }

  private isErrorResponse(response: unknown): response is DlqErrorResponse {
    return (
      response != null &&
      typeof response === "object" &&
      "error" in response &&
      "statusCode" in response
    );
  }
}
