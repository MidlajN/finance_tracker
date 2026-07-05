import { LocalEventRepository } from "../repositories/LocalDatabaseRepository";
import { RemoteEventRepository } from "../repositories/RemoteEventRepository";
import { SyncService } from "./SyncService";

export class MobileEventService {
  static async confirm(eventId: string) {
    await RemoteEventRepository.confirm(eventId);
    await SyncService.pullRemoteState();
  }

  static async ignore(eventId: string) {
    const event = await RemoteEventRepository.ignore(eventId);
    await LocalEventRepository.upsert(event);
  }
}
