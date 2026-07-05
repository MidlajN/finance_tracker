import type {
  CreateFinancialEventSyncPayload,
  SyncQueueItem,
} from "@finance/shared-api";
import type {
  CachedFinancialEvent,
  FinancialEventInput,
  Json,
} from "@finance/shared-types";

import { supabase } from "../lib/supabase";
import { MobileRuleEngineService } from "../services/MobileRuleEngineService";

interface RemoteFinancialEventRow {
  id: string;
  amount: number;
  confidence: number;
  currency: string;
  direction: CachedFinancialEvent["direction"];
  merchant_id: string | null;
  merchant_name_raw: string | null;
  metadata: Json;
  notes: string | null;
  occurred_at: string;
  status: CachedFinancialEvent["status"];
  created_at: string;
  updated_at: string;
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

function parseJsonPayload(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Json;
  } catch {
    return value;
  }
}

function withSyncMetadata(
  event: FinancialEventInput,
  item: SyncQueueItem<CreateFinancialEventSyncPayload>
): FinancialEventInput {
  return {
    ...event,
    metadata: {
      ...getMetadataObject(event.metadata),
      client_request_id: item.requestId,
      local_event_id: item.payload.localEventId,
      sync_source: item.payload.source,
    },
  };
}

function toCachedFinancialEvent(
  row: RemoteFinancialEventRow
): CachedFinancialEvent {
  return {
    id: row.id,
    amount: row.amount,
    confidence: row.confidence,
    currency: row.currency,
    direction: row.direction,
    merchant_id: row.merchant_id,
    merchant_name_raw: row.merchant_name_raw,
    metadata: row.metadata,
    notes: row.notes,
    occurred_at: row.occurred_at,
    status: row.status,
    source:
      getMetadataString(row.metadata, "source") ??
      getMetadataString(row.metadata, "sync_source") ??
      "supabase",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class RemoteEventRepository {
  static async list() {
    const { data, error } = await supabase
      .from("financial_events")
      .select("*")
      .order("occurred_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return ((data ?? []) as RemoteFinancialEventRow[]).map(
      toCachedFinancialEvent
    );
  }

  static async findByClientRequestId(requestId: string) {
    const { data, error } = await supabase
      .from("financial_events")
      .select("*")
      .filter("metadata->>client_request_id", "eq", requestId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data
      ? toCachedFinancialEvent(data as RemoteFinancialEventRow)
      : null;
  }

  static async createFromSyncItem(
    item: SyncQueueItem<CreateFinancialEventSyncPayload>
  ) {
    const existing = await this.findByClientRequestId(item.requestId);

    if (existing) {
      return existing;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated.");
    }

    const eventWithSyncMetadata = withSyncMetadata(
      item.payload.event,
      item
    );
    const result =
      await MobileRuleEngineService.applyToEventWithResult(
        eventWithSyncMetadata
      );

    const { data, error } = await supabase
      .from("financial_events")
      .insert({
        ...result.event,
        id: item.payload.localEventId,
        user_id: user.id,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const createdEvent = data as RemoteFinancialEventRow;
    await this.addSource(createdEvent.id, result.event);

    if (result.rule?.auto_confirm) {
      const { error: confirmError } = await supabase.rpc(
        "confirm_financial_event",
        {
          p_event_id: createdEvent.id,
        }
      );

      if (confirmError) {
        throw confirmError;
      }
    }

    return toCachedFinancialEvent(createdEvent);
  }

  static async update(
    id: string,
    updates: Partial<FinancialEventInput>
  ) {
    const { data, error } = await supabase
      .from("financial_events")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return toCachedFinancialEvent(data as RemoteFinancialEventRow);
  }

  static async delete(id: string) {
    const { error } = await supabase
      .from("financial_events")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }
  }

  static async confirm(id: string) {
    const { error } = await supabase.rpc("confirm_financial_event", {
      p_event_id: id,
    });

    if (error) {
      throw error;
    }
  }

  static async ignore(id: string) {
    return this.update(id, {
      status: "ignored",
    });
  }

  private static async addSource(
    eventId: string,
    event: FinancialEventInput
  ) {
    const rawPayload = getMetadataString(event.metadata, "rawPayload");
    const packageName = getMetadataString(event.metadata, "packageName");
    const reference = getMetadataString(event.metadata, "reference");

    const { error } = await supabase.from("event_sources").insert({
      confidence: event.confidence ?? 0,
      event_id: eventId,
      metadata: {
        reference,
      },
      payload:
        parseJsonPayload(rawPayload) ??
        getMetadataObject(event.metadata),
      parser_version: "mobile-notification-v1",
      source_application: packageName,
      source_type:
        getMetadataString(event.metadata, "source") === "android_notification"
          ? "notification"
          : "manual",
    });

    if (error) {
      throw error;
    }
  }
}
