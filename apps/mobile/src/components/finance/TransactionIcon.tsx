import { View } from "react-native";

import type {
  CategoryReference,
  TransactionType,
} from "@finance/shared-types";

import { getTransactionVisual } from "../../utils/financeVisuals";

// The one transaction glyph used by every list: the category's icon in its
// own colour on an 8% tint of that colour — the same recipe as the
// category chips, so a row matches the chip that categorised it.
export function TransactionIcon({
  category,
  type,
}: {
  category: CategoryReference | null | undefined;
  type: TransactionType;
}) {
  const visual = getTransactionVisual(type, category);
  const Icon = visual.Icon;

  return (
    <View
      className="h-9 w-9 items-center justify-center rounded-xl"
      style={{ backgroundColor: `${visual.color}14` }}
    >
      <Icon color={visual.color} size={16} strokeWidth={2.2} />
    </View>
  );
}
