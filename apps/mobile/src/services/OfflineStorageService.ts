import type {
  CreateFinancialEventSyncPayload,
  DeleteFinancialEventSyncPayload,
  SyncQueueItem,
  UpdateFinancialEventSyncPayload,
} from "@finance/shared-api";
import type {
  CachedBudget,
  CachedCategory,
  CachedFinancialEvent,
  CachedFinancialRule,
  CachedMerchant,
  CachedTransaction,
  FinancialEventInput,
  Json,
} from "@finance/shared-types";

import {
  AppMetadataRepository,
  initializeLocalDatabase,
  LocalBudgetRepository,
  LocalCategoryRepository,
  LocalEventRepository,
  LocalMerchantRepository,
  LocalRuleRepository,
  LocalTransactionRepository,
  SyncQueueRepository,
} from "../repositories/LocalDatabaseRepository";
import { MobileRuleEngineService } from "./MobileRuleEngineService";
import type { ParsedNotificationResult } from "./NotificationService";

export interface OfflineSnapshot {
  budgets: CachedBudget[];
  categories: CachedCategory[];
  events: CachedFinancialEvent[];
  merchants: CachedMerchant[];
  rules: CachedFinancialRule[];
  transactions: CachedTransaction[];
  queue: SyncQueueItem[];
}

export interface PersistedFinancialEvent {
  event: CachedFinancialEvent;
  queueItem: SyncQueueItem<CreateFinancialEventSyncPayload>;
}

export interface UpdatedFinancialEvent {
  event: CachedFinancialEvent;
  queueItem: SyncQueueItem<UpdateFinancialEventSyncPayload>;
}

const DEVICE_ID_KEY = "device_id";

function createLocalId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function formatUuid(hex: string, version: "4" | "5") {
  const characters = hex.padEnd(32, "0").slice(0, 32).split("");
  characters[12] = version;
  characters[16] = (8 + (Number.parseInt(characters[16], 16) % 4))
    .toString(16);
  const normalized = characters.join("");

  return [
    normalized.slice(0, 8),
    normalized.slice(8, 12),
    normalized.slice(12, 16),
    normalized.slice(16, 20),
    normalized.slice(20, 32),
  ].join("-");
}

function createRandomUuid() {
  const hex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");

  return formatUuid(hex, "4");
}

function hashToHex(value: string, seed: number) {
  let hash = 2166136261 ^ seed;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function createStableUuid(value: string) {
  const hex = [0, 1, 2, 3]
    .map((seed) => hashToHex(value, seed))
    .join("");

  return formatUuid(hex, "5");
}

function sanitizeIdSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
}

function getMetadataObject(metadata: Json | null | undefined) {
  return typeof metadata === "object" &&
    metadata !== null &&
    !Array.isArray(metadata)
    ? metadata
    : {};
}

function getMetadataString(
  metadata: Json | null | undefined,
  key: string
) {
  const value = getMetadataObject(metadata)[key];

  return typeof value === "string" && value.trim()
    ? value
    : null;
}

function getStableLocalEventId(event: FinancialEventInput) {
  const source = getMetadataString(event.metadata, "source");
  const reference = getMetadataString(event.metadata, "reference");

  if (!source || !reference) {
    return createRandomUuid();
  }

  return createStableUuid(`${sanitizeIdSegment(source)}:${reference}`);
}

function toFinancialEventInput(
  event: CachedFinancialEvent
): FinancialEventInput {
  return {
    amount: event.amount,
    confidence: event.confidence,
    currency: event.currency,
    direction: event.direction,
    merchant_id: event.merchant_id,
    merchant_name_raw: event.merchant_name_raw,
    metadata: event.metadata,
    notes: event.notes,
    occurred_at: event.occurred_at,
    status: event.status,
  };
}

export class OfflineStorageService {
  static async initialize() {
    await initializeLocalDatabase();
    await this.getDeviceId();
  }

  static async getSnapshot(): Promise<OfflineSnapshot> {
    await this.initialize();

    const [
      events,
      transactions,
      categories,
      merchants,
      budgets,
      rules,
      queue,
    ] = await Promise.all([
      LocalEventRepository.list(),
      LocalTransactionRepository.list(),
      LocalCategoryRepository.list(),
      LocalMerchantRepository.list(),
      LocalBudgetRepository.list(),
      LocalRuleRepository.list(),
      SyncQueueRepository.listPending(),
    ]);

    return {
      budgets,
      categories,
      events,
      merchants,
      rules,
      transactions,
      queue,
    };
  }

  static async getDeviceId() {
    const existingDeviceId = await AppMetadataRepository.get(DEVICE_ID_KEY);

    if (existingDeviceId) {
      return existingDeviceId;
    }

    const deviceId = createLocalId("device");
    await AppMetadataRepository.set(DEVICE_ID_KEY, deviceId);

    return deviceId;
  }

  static async persistFinancialEvent(
    event: FinancialEventInput,
    source: string
  ): Promise<PersistedFinancialEvent> {
    await this.initialize();

    const result =
      await MobileRuleEngineService.applyLocalRulesToEventWithResult(
        event
      );
    const stableLocalEventId = getStableLocalEventId(result.event);
    const cachedEvent = await LocalEventRepository.createPending(
      result.event,
      source,
      stableLocalEventId
    );
    const deviceId = await this.getDeviceId();
    const payload: CreateFinancialEventSyncPayload = {
      event: toFinancialEventInput(cachedEvent),
      idempotencyKey: cachedEvent.id,
      localEventId: cachedEvent.id,
      source: cachedEvent.source,
    };
    const queueItem = await SyncQueueRepository.enqueue(
      "create_financial_event",
      payload,
      deviceId,
      `create_financial_event:${cachedEvent.id}`
    );

    return {
      event: cachedEvent,
      queueItem,
    };
  }

  static async updateFinancialEvent(
    eventId: string,
    updates: Partial<FinancialEventInput>
  ): Promise<UpdatedFinancialEvent> {
    await this.initialize();

    const event = await LocalEventRepository.update(eventId, updates);
    const deviceId = await this.getDeviceId();
    const payload: UpdateFinancialEventSyncPayload = {
      eventId,
      updates,
    };
    const queueItem = await SyncQueueRepository.enqueue(
      "update_financial_event",
      payload,
      deviceId,
      `update_financial_event:${eventId}:${event.updated_at}`
    );

    return {
      event,
      queueItem,
    };
  }

  static async deleteFinancialEvent(eventId: string) {
    await this.initialize();

    await LocalEventRepository.delete(eventId);

    const deviceId = await this.getDeviceId();
    const payload: DeleteFinancialEventSyncPayload = {
      eventId,
    };

    return SyncQueueRepository.enqueue(
      "delete_financial_event",
      payload,
      deviceId,
      `delete_financial_event:${eventId}`
    );
  }

  static persistParsedNotification(result: ParsedNotificationResult) {
    return this.persistFinancialEvent(
      result.financialEvent,
      result.event.source
    );
  }
}
