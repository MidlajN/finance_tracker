import { EventRepository } from "../repositories/EventRepository";
import { MerchantRepository } from "../repositories/MerchantRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";

export type Event = Awaited<
    ReturnType<typeof EventRepository.list>
>[number];

export type Transaction = Awaited<
    ReturnType<typeof TransactionRepository.list>
>[number];

export type Merchant = Awaited<
    ReturnType<typeof MerchantRepository.search>
>[number];