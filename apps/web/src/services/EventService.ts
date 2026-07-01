import { EventRepository } from "../repositories/EventRepository";
import { RuleEngineService } from "./RuleEngineService";

import type { FinancialEventInput } from "@finance/shared-types";

export class EventService {
    static async create(event: FinancialEventInput) {
        const result =
            await RuleEngineService.applyToEventWithResult(
                event
            );

        const createdEvent =
            await EventRepository.create(
                result.event
            );

        if (result.rule?.auto_confirm) {
            await EventRepository.confirm(
                createdEvent.id
            );
        }

        return EventRepository.get(
            createdEvent.id
        );
    }

    static async confirm(id: string) {
        return EventRepository.confirm(id);
    }

    static async ignore(id: string) {
        return EventRepository.ignore(id);
    }
}
