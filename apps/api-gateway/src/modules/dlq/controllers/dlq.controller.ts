import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { DlqReplayService } from "../services/dlq-replay.service";

@Controller("dlq")
export class DlqController {
  constructor(private readonly dlqReplayService: DlqReplayService) {}

  @Get()
  async list(@Query("status") status?: "pending" | "replayed") {
    return this.dlqReplayService.findAll(status);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.dlqReplayService.findOne(id);
  }

  @Patch(":id/payload")
  async updatePayload(
    @Param("id") id: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.dlqReplayService.updatePayload(id, payload);
  }

  @Post(":id/replay")
  @HttpCode(HttpStatus.OK)
  async replay(@Param("id") id: string) {
    return this.dlqReplayService.replay(id);
  }
}
