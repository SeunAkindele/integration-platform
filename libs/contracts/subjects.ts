export const SUBJECTS = {
    WEBHOOK_RECEIVED_V1: "webhook.received.v1",
    WEBHOOK_VALIDATED_V1: "webhook.validated.v1",
    WEBHOOK_DLQ_V1: "dlq.webhook.v1",
    
    INTEGRATION_PROCESSED_V1: "integration.processed.v1",
    INTEGRATION_COMMAND_V1: "integration.command.v1",

    DLQ_RPC_LIST: "dlq.rpc.list",
    DLQ_RPC_FIND_ONE: "dlq.rpc.findOne",
    DLQ_RPC_UPDATE_PAYLOAD: "dlq.rpc.updatePayload",
    DLQ_RPC_REPLAY: "dlq.rpc.replay",
  } as const;