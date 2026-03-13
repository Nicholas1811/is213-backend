import type { Channel, ChannelModel, ConfirmChannel, Connection } from "amqplib";
import amqp from "amqplib";
import { appLogger } from "@/middlewares/pino-logger";
import { rabbitConfig } from "./config";

const logger = appLogger.child({ module: "rabbitmq-connection" });

interface RabbitState {
  model: ChannelModel;
  connection: Connection;
  publishChannel: ConfirmChannel;
  consumeChannel: Channel;
}

let state: RabbitState | null = null;
let connecting: Promise<RabbitState> | null = null;

function resetState() {
  state = null;
  connecting = null;
}

async function createState(): Promise<RabbitState> {
  logger.info({ url: rabbitConfig.url }, "Connecting to RabbitMQ");
  const model = await amqp.connect(rabbitConfig.url);

  model.on("error", (error) => {
    logger.error({ err: error }, "RabbitMQ connection error");
    resetState();
  });

  model.on("close", () => {
    logger.warn("RabbitMQ connection closed");
    resetState();
  });

  const publishChannel = await model.createConfirmChannel();
  const consumeChannel = await model.createChannel();

  logger.info("RabbitMQ connected & channels ready");

  return {
    model,
    connection: model.connection,
    publishChannel,
    consumeChannel,
  };
}

export async function getRabbitConnection(): Promise<RabbitState> {
  if (state) {
    return state;
  }

  if (connecting) {
    return connecting;
  }

  connecting = (async () => {
    try {
      const nextState = await createState();
      state = nextState;
      return nextState;
    }
    catch (error) {
      logger.error({ err: error }, "RabbitMQ connect attempt failed");
      resetState();
      throw error;
    }
  })();

  return connecting;
}

export async function closeRabbitConnection(): Promise<void> {
  const current = state;
  resetState();

  if (!current) {
    return;
  }

  try {
    await current.publishChannel.close();
  }
  catch (error) {
    logger.warn({ err: error }, "Failed to close publish channel");
  }

  try {
    await current.consumeChannel.close();
  }
  catch (error) {
    logger.warn({ err: error }, "Failed to close consume channel");
  }

  try {
    await current.model.close();
  }
  catch (error) {
    logger.warn({ err: error }, "Failed to close connection");
  }
}
