import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MotiView } from "moti";
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarDays,
  Check,
  ChartPie,
  CreditCard,
  FileText,
  Hash,
  IndianRupee,
  Landmark,
  Layers,
  Pencil,
  Percent,
  Plus,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react-native";
import {
  Animated,
  InteractionManager,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type { TextInputProps } from "react-native";

import type {
  AccountLike,
  AccountType,
  AssetLike,
  AssetType,
  CachedAccount,
  CachedAsset,
  CachedGoal,
  CachedInvestment,
  CachedLiability,
  CachedLoan,
  GoalLike,
  GoalStatus,
  InvestmentLike,
  LiabilityLike,
  LiabilityType,
  LoanLike,
  LoanType,
} from "@finance/shared-types";

import { DangerConfirmModal } from "../components/finance/DangerConfirmModal";
import { financeStyles } from "../components/finance/financeStyles";
import { MobileDashboardService } from "../services/MobileDashboardService";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import { premiumTheme } from "../theme/premiumTheme";
import type {
  FinancialIntelligenceResource,
  RootStackParamList,
} from "../types/navigation";
import { formatPercent, titleCase } from "../utils/financeFormat";
import { getAccountTypeVisual } from "../utils/financeVisuals";

type IntelligenceResource = FinancialIntelligenceResource;

type IntelligenceItem =
  | CachedAccount
  | CachedAsset
  | CachedLiability
  | CachedLoan
  | CachedInvestment
  | CachedGoal;

const accountTypeOptions: AccountType[] = [
  "bank",
  "cash",
  "credit_card",
  "digital_wallet",
];

const advancedResourceTabs: IntelligenceResource[] = [
  "asset",
  "liability",
  "investment",
  "goal",
  "loan",
];

const trackResourceVisuals: Record<
  IntelligenceResource,
  { color: string; Icon: typeof Landmark }
> = {
  account: { color: "#0f172a", Icon: CreditCard },
  asset: { color: "#16a34a", Icon: ChartPie },
  goal: { color: "#2563eb", Icon: Target },
  investment: { color: "#7c3aed", Icon: TrendingUp },
  liability: { color: "#ef4444", Icon: CreditCard },
  loan: { color: "#f59e0b", Icon: Banknote },
};

const resourceLabels: Record<IntelligenceResource, string> = {
  account: "account",
  asset: "asset",
  goal: "goal",
  investment: "investment",
  liability: "liability",
  loan: "loan",
};

type FinancialIntelligenceScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "FinancialIntelligence"
>;

// Press feedback matching financeStyles.saveButtonDisabled (opacity 0.62).
const pressedDim = "active:opacity-[0.62]";

// Transforms stay as a plain style object.
const illustrationCardTiltStyle = {
  transform: [{ rotate: "8deg" }],
} as const;

// Custom shadow for the active account-type card; shadows stay style objects.
const accountTypeActiveShadowStyle = {
  shadowColor: "#101828",
  shadowOffset: {
    height: 4,
    width: 0,
  },
  shadowOpacity: 0.07,
  shadowRadius: 10,
} as const;

// Animated.Text is not NativeWind-interop'd, so the floating label keeps a
// plain style object; the animated color/size/position merge in at render.
const accountFieldFloatLabelStyle = {
  backgroundColor: "#ffffff",
  borderRadius: 4,
  fontWeight: "600",
  paddingHorizontal: 4,
  position: "absolute",
  zIndex: 2,
} as const;

function getDefaultResourceType(resource: IntelligenceResource) {
  if (resource === "account") return "bank";
  if (resource === "asset") return "other";
  if (resource === "liability") return "other";
  if (resource === "loan") return "personal_loan";

  return "";
}

function getResourceHelpText(resource: IntelligenceResource) {
  if (resource === "account") {
    return "Add the places where money is held or owed, such as cash, a bank account, card, or wallet.";
  }

  if (resource === "asset") {
    return "Track owned value outside daily spending, such as deposits, property, gold, mutual funds, or vehicles.";
  }

  if (resource === "liability") {
    return "Track money you owe, such as credit cards, loans, or mortgages.";
  }

  if (resource === "loan") {
    return "Add repayment details for an existing liability.";
  }

  if (resource === "investment") {
    return "Track holdings by symbol, quantity, and price.";
  }

  return "Set a target amount and date for a financial goal.";
}

function getNamePlaceholder(resource: IntelligenceResource) {
  if (resource === "account") return "Account name, e.g. Cash or HDFC Bank";
  if (resource === "investment") return "Symbol, e.g. INFY or NIFTYBEES";
  if (resource === "goal") return "Goal name, e.g. Emergency fund";

  return `${titleCase(resource)} name`;
}

function getTypePlaceholder(resource: IntelligenceResource) {
  if (resource === "account") {
    return "Account type, e.g. bank, cash, credit_card";
  }

  if (resource === "asset") {
    return "Asset type, e.g. mutual_fund, equity, vehicle";
  }

  if (resource === "liability") {
    return "Liability type, e.g. credit_card, personal_loan";
  }

  return "Loan type, e.g. personal_loan";
}

export function FinancialIntelligenceScreen({
  navigation,
  route,
}: FinancialIntelligenceScreenProps) {
  const requestedResource = route.params?.initialResource ?? "account";
  const accounts = useOfflineStore((state) => state.accounts);
  const assets = useOfflineStore((state) => state.assets);
  const liabilities = useOfflineStore((state) => state.liabilities);
  const loans = useOfflineStore((state) => state.loans);
  const investments = useOfflineStore((state) => state.investments);
  const goals = useOfflineStore((state) => state.goals);
  const transactions = useOfflineStore((state) => state.transactions);
  const exchangeRates = useOfflineStore((state) => state.exchangeRates);
  const createAccount = useOfflineStore((state) => state.createAccount);
  const updateAccount = useOfflineStore((state) => state.updateAccount);
  const deleteAccount = useOfflineStore((state) => state.deleteAccount);
  const createAsset = useOfflineStore((state) => state.createAsset);
  const updateAsset = useOfflineStore((state) => state.updateAsset);
  const deleteAsset = useOfflineStore((state) => state.deleteAsset);
  const createLiability = useOfflineStore((state) => state.createLiability);
  const updateLiability = useOfflineStore((state) => state.updateLiability);
  const deleteLiability = useOfflineStore((state) => state.deleteLiability);
  const createLoan = useOfflineStore((state) => state.createLoan);
  const updateLoan = useOfflineStore((state) => state.updateLoan);
  const deleteLoan = useOfflineStore((state) => state.deleteLoan);
  const createInvestment = useOfflineStore((state) => state.createInvestment);
  const updateInvestment = useOfflineStore((state) => state.updateInvestment);
  const deleteInvestment = useOfflineStore((state) => state.deleteInvestment);
  const createGoal = useOfflineStore((state) => state.createGoal);
  const updateGoal = useOfflineStore((state) => state.updateGoal);
  const deleteGoal = useOfflineStore((state) => state.deleteGoal);
  const synchronize = useSyncStore((state) => state.synchronize);
  const lastAppliedFormIntentId = useRef<number | undefined>(undefined);
  const [resource, setResource] =
    useState<IntelligenceResource>(requestedResource);
  const [advancedModalVisible, setAdvancedModalVisible] = useState(
    requestedResource !== "account"
  );
  const [editing, setEditing] = useState<IntelligenceItem | null>(null);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{
    id: string;
    kind: IntelligenceResource;
    name: string;
  } | null>(null);

  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState(getDefaultResourceType(requestedResource));
  const [currency, setCurrency] = useState("INR");
  const [amount, setAmount] = useState("");
  const [secondaryAmount, setSecondaryAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [rate, setRate] = useState("0");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<GoalStatus>("active");
  const [liabilityId, setLiabilityId] = useState("");
  const [payments, setPayments] = useState("0");
  const [exchange, setExchange] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSavingResource, setIsSavingResource] = useState(false);
  const resourceSavingRef = useRef(false);
  const overview = useMemo(
    () =>
      MobileDashboardService.getFinancialIntelligenceOverview({
        accounts,
        assets,
        baseCurrency: "INR",
        exchangeRates,
        goals,
        investments,
        liabilities,
        loans,
        transactions,
      }),
    [
      accounts,
      assets,
      exchangeRates,
      goals,
      investments,
      liabilities,
      loans,
      transactions,
    ]
  );
  const totalAccountBalance = overview.accounts.reduce(
    (total, account) => total + account.currentBalance,
    0
  );

  const resetForm = useCallback((nextResource: IntelligenceResource) => {
    setResource(nextResource);
    setEditing(null);
    setName("");
    setType(getDefaultResourceType(nextResource));
    setCurrency("INR");
    setAmount("");
    setSecondaryAmount("");
    setQuantity("1");
    setRate("0");
    setDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setStatus("active");
    setLiabilityId(liabilities[0]?.id ?? "");
    setPayments("0");
    setExchange("");
    setNotes("");
    setError(null);
  }, [liabilities]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          className={`min-h-9 flex-row items-center gap-[5px] rounded-full bg-ink px-[13px] ${pressedDim}`}
          onPress={() => {
            resetForm("account");
            setAccountModalVisible(true);
          }}
          style={premiumTheme.shadow.soft}
        >
          <Plus color="#ffffff" size={15} strokeWidth={2.7} />
          <Text className="text-[12px] font-bold text-white">Add</Text>
        </Pressable>
      ),
    });
  }, [navigation, resetForm]);

  useEffect(() => {
    const nextResource = route.params?.initialResource;
    const formIntentId = route.params?.formIntentId;

    if (!nextResource || lastAppliedFormIntentId.current === formIntentId) {
      return;
    }

    lastAppliedFormIntentId.current = formIntentId;
    resetForm(nextResource);
    setAdvancedModalVisible(nextResource !== "account");

    // "Add account" intents from other screens land here with an intent id.
    // Open the sheet only after the screen transition settles so the two
    // animations read as a sequence instead of colliding.
    InteractionManager.runAfterInteractions(() => {
      setAccountModalVisible(
        nextResource === "account" && formIntentId !== undefined
      );
    });
  }, [
    resetForm,
    route.params?.formIntentId,
    route.params?.initialResource,
  ]);

  function loadForEdit(nextResource: IntelligenceResource, item: IntelligenceItem) {
    resetForm(nextResource);
    setEditing(item);
    setAdvancedModalVisible(nextResource !== "account");

    if (nextResource === "account") {
      const account = item as CachedAccount;
      setName(account.name);
      setType(account.account_type);
      setCurrency(account.currency);
      setAmount(account.opening_balance.toString());
      setNotes(account.institution ?? "");
    }

    if (nextResource === "asset") {
      const asset = item as CachedAsset;
      setName(asset.name);
      setType(asset.asset_type);
      setCurrency(asset.currency);
      setAmount(asset.current_valuation.toString());
      setSecondaryAmount(asset.acquisition_value.toString());
      setQuantity(asset.quantity.toString());
      setDate(asset.acquisition_date);
      setNotes(asset.notes ?? "");
    }

    if (nextResource === "liability") {
      const liability = item as CachedLiability;
      setName(liability.name);
      setType(liability.liability_type);
      setCurrency(liability.currency);
      setAmount(liability.outstanding_balance.toString());
      setSecondaryAmount(liability.original_amount.toString());
      setRate(liability.interest_rate.toString());
      setDate(liability.start_date);
      setEndDate(liability.end_date ?? "");
    }

    if (nextResource === "loan") {
      const loan = item as CachedLoan;
      setType(loan.loan_type);
      setLiabilityId(loan.liability_id);
      setAmount(loan.monthly_payment.toString());
      setSecondaryAmount(loan.interest_accrued.toString());
      setPayments(loan.remaining_payments.toString());
    }

    if (nextResource === "investment") {
      const investment = item as CachedInvestment;
      setName(investment.symbol);
      setCurrency(investment.currency);
      setAmount(investment.average_purchase_price.toString());
      setSecondaryAmount((investment.current_price ?? 0).toString());
      setQuantity(investment.quantity.toString());
      setExchange(investment.exchange ?? "");
    }

    if (nextResource === "goal") {
      const goal = item as CachedGoal;
      setName(goal.name);
      setCurrency(goal.currency);
      setAmount(goal.target_amount.toString());
      setDate(goal.target_date ?? "");
      setStatus(goal.status);
    }
  }

  function editAccount(account: CachedAccount) {
    loadForEdit("account", account);
    setAccountModalVisible(true);
  }

  function openAddAccount() {
    resetForm("account");
    setAccountModalVisible(true);
  }

  function closeAccountEdit() {
    if (!isSavingResource) {
      setAccountModalVisible(false);
      resetForm("account");
    }
  }

  function parseNumber(value: string, label: string, allowZero = false) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0 || (!allowZero && parsed === 0)) {
      throw new Error(label);
    }

    return parsed;
  }

  function requireText(value: string, label: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      throw new Error(label);
    }

    return trimmed;
  }

  async function handleSave() {
    if (resourceSavingRef.current) {
      return;
    }

    resourceSavingRef.current = true;
    setIsSavingResource(true);

    try {
      setError(null);
      const savedResource = resource;

      if (resource === "account") {
        const accountName = requireText(name, "Enter an account name.");
        const accountCurrency = requireText(currency, "Enter a currency.");
        const payload: AccountLike = {
          name: accountName,
          account_type: (type || "bank") as AccountType,
          currency: accountCurrency,
          opening_balance: parseNumber(amount || "0", "Enter an opening balance.", true),
          institution: notes.trim() || null,
          archived: (editing as CachedAccount | null)?.archived ?? false,
        };
        if (editing) {
          await updateAccount(editing.id, payload);
        } else {
          await createAccount(payload);
        }
      }

      if (resource === "asset") {
        const assetName = requireText(name, "Enter an asset name.");
        const assetType = requireText(type, "Enter an asset type.");
        const assetCurrency = requireText(currency, "Enter a currency.");
        const acquisitionDate = requireText(date, "Enter an acquisition date.");
        const payload: AssetLike = {
          name: assetName,
          asset_type: assetType as AssetType,
          currency: assetCurrency,
          quantity: parseNumber(quantity, "Enter a quantity."),
          acquisition_value: parseNumber(
            secondaryAmount || "0",
            "Enter an acquisition value.",
            true
          ),
          current_valuation: parseNumber(amount, "Enter a valuation."),
          acquisition_date: acquisitionDate,
          notes: notes.trim() || null,
        };
        if (editing) {
          await updateAsset(editing.id, payload);
        } else {
          await createAsset(payload);
        }
      }

      if (resource === "liability") {
        const liabilityName = requireText(name, "Enter a liability name.");
        const liabilityType = requireText(type, "Enter a liability type.");
        const liabilityCurrency = requireText(currency, "Enter a currency.");
        const startDate = requireText(date, "Enter a start date.");
        const payload: LiabilityLike = {
          name: liabilityName,
          liability_type: liabilityType as LiabilityType,
          currency: liabilityCurrency,
          outstanding_balance: parseNumber(amount, "Enter a balance."),
          original_amount: parseNumber(secondaryAmount, "Enter an original amount."),
          interest_rate: parseNumber(rate || "0", "Enter an interest rate.", true),
          start_date: startDate,
          end_date: endDate || null,
        };
        if (editing) {
          await updateLiability(editing.id, payload);
        } else {
          await createLiability(payload);
        }
      }

      if (resource === "loan") {
        if (!liabilityId) {
          throw new Error("Create or select a liability first.");
        }
        const loanType = requireText(type, "Enter a loan type.");
        const payload: LoanLike = {
          liability_id: liabilityId,
          loan_type: loanType as LoanType,
          monthly_payment: parseNumber(amount, "Enter a monthly payment."),
          remaining_payments: parseNumber(
            payments || "0",
            "Enter remaining payments.",
            true
          ),
          interest_accrued: parseNumber(
            secondaryAmount || "0",
            "Enter accrued interest.",
            true
          ),
        };
        if (editing) {
          await updateLoan(editing.id, payload);
        } else {
          await createLoan(payload);
        }
      }

      if (resource === "investment") {
        const symbol = requireText(name, "Enter an investment symbol.");
        const investmentCurrency = requireText(currency, "Enter a currency.");
        const payload: InvestmentLike = {
          symbol: symbol.toUpperCase(),
          quantity: parseNumber(quantity, "Enter a quantity."),
          average_purchase_price: parseNumber(amount, "Enter an average price."),
          current_price: secondaryAmount
            ? parseNumber(secondaryAmount, "Enter a current price.", true)
            : null,
          currency: investmentCurrency,
          exchange: exchange.trim() || null,
          purchase_history: (editing as CachedInvestment | null)?.purchase_history ?? [],
        };
        if (editing) {
          await updateInvestment(editing.id, payload);
        } else {
          await createInvestment(payload);
        }
      }

      if (resource === "goal") {
        const goalName = requireText(name, "Enter a goal name.");
        const goalCurrency = requireText(currency, "Enter a currency.");
        const payload: GoalLike = {
          name: goalName,
          target_amount: parseNumber(amount, "Enter a target amount."),
          currency: goalCurrency,
          target_date: date || null,
          status,
        };
        if (editing) {
          await updateGoal(editing.id, payload);
        } else {
          await createGoal(payload);
        }
      }

      await synchronize();
      if (savedResource === "account") {
        setAccountModalVisible(false);
        resetForm("account");
      } else {
        setAdvancedModalVisible(false);
        resetForm("account");
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save resource."
      );
    } finally {
      resourceSavingRef.current = false;
      setIsSavingResource(false);
    }
  }

  async function handleDelete(kind: IntelligenceResource, id: string) {
    if (kind === "account") await deleteAccount(id);
    if (kind === "asset") await deleteAsset(id);
    if (kind === "liability") await deleteLiability(id);
    if (kind === "loan") await deleteLoan(id);
    if (kind === "investment") await deleteInvestment(id);
    if (kind === "goal") await deleteGoal(id);
    await synchronize();
  }

  function requestDelete(
    kind: IntelligenceResource,
    id: string,
    name: string
  ) {
    setDeletingItem({ id, kind, name });
  }

  async function confirmDeleteItem() {
    if (!deletingItem || isDeletingItem) {
      return;
    }

    setIsDeletingItem(true);

    try {
      await handleDelete(deletingItem.kind, deletingItem.id);
      setDeletingItem(null);
    } finally {
      setIsDeletingItem(false);
    }
  }

  function openAdvancedForm(nextResource: IntelligenceResource) {
    resetForm(nextResource);
    setAdvancedModalVisible(true);
  }

  function closeAdvancedForm() {
    setAdvancedModalVisible(false);
    resetForm("account");
  }

  function renderResourceFields() {
    const amountLabel =
      resource === "account"
        ? "Opening balance"
        : resource === "asset"
          ? "Current valuation"
          : resource === "liability"
            ? "Outstanding balance"
            : resource === "loan"
              ? "Monthly payment"
              : resource === "investment"
                ? "Average purchase price"
                : "Target amount";
    const secondaryAmountLabel =
      resource === "asset"
        ? "Acquisition value"
        : resource === "liability"
          ? "Original amount"
          : resource === "loan"
            ? "Interest accrued"
            : "Current price";
    const showDates = ["asset", "liability", "goal"].includes(resource);

    return (
      <>
        <Text className="mt-1 text-[16px] font-extrabold tracking-[-0.2px] text-ink">
          1.  {titleCase(resourceLabels[resource])} details
        </Text>
        {resource !== "loan" && (
          <AccountInputField
            autoCapitalize={resource === "investment" ? "characters" : "sentences"}
            icon={
              resource === "investment" ? (
                <TrendingUp color="#64748b" size={16} strokeWidth={2.2} />
              ) : (
                <Landmark color="#64748b" size={16} strokeWidth={2.2} />
              )
            }
            label={resource === "investment" ? "Symbol" : "Name"}
            onChangeText={setName}
            placeholder={getNamePlaceholder(resource)}
            value={name}
          />
        )}
        {["asset", "liability", "loan"].includes(resource) && (
          <AccountInputField
            icon={<Layers color="#64748b" size={16} strokeWidth={2.2} />}
            label="Type"
            onChangeText={setType}
            placeholder={getTypePlaceholder(resource)}
            value={type}
          />
        )}
        {resource === "investment" && (
          <AccountInputField
            icon={<Landmark color="#64748b" size={16} strokeWidth={2.2} />}
            label="Exchange"
            onChangeText={setExchange}
            placeholder="e.g. NSE or BSE"
            value={exchange}
          />
        )}
        {resource === "loan" && (
          <AccountInputField
            icon={<Layers color="#64748b" size={16} strokeWidth={2.2} />}
            label="Linked liability ID"
            onChangeText={setLiabilityId}
            placeholder="Liability this loan pays down"
            value={liabilityId}
          />
        )}
        {resource === "goal" && (
          <AccountInputField
            icon={<Target color="#64748b" size={16} strokeWidth={2.2} />}
            label="Status"
            onChangeText={(value) => setStatus(value as GoalStatus)}
            placeholder="active, achieved, or paused"
            value={status}
          />
        )}
        {["account", "asset"].includes(resource) && (
          <AccountInputField
            icon={<FileText color="#64748b" size={16} strokeWidth={2.2} />}
            label={resource === "account" ? "Institution" : "Notes"}
            onChangeText={setNotes}
            placeholder={
              resource === "account" ? "e.g. HDFC, SBI, ICICI" : "Optional"
            }
            value={notes}
          />
        )}

        <Text className="mt-1 text-[16px] font-extrabold tracking-[-0.2px] text-ink">2.  Amounts</Text>
        {["asset", "investment"].includes(resource) && (
          <AccountInputField
            icon={<Hash color="#64748b" size={16} strokeWidth={2.2} />}
            keyboardType="decimal-pad"
            label="Quantity"
            onChangeText={setQuantity}
            placeholder="0"
            value={quantity}
          />
        )}
        <AccountInputField
          icon={<IndianRupee color="#64748b" size={16} strokeWidth={2.2} />}
          keyboardType="decimal-pad"
          label={amountLabel}
          onChangeText={setAmount}
          placeholder="0.00"
          value={amount}
        />
        {["asset", "liability", "loan", "investment"].includes(resource) && (
          <AccountInputField
            icon={
              resource === "investment" ? (
                <TrendingUp color="#64748b" size={16} strokeWidth={2.2} />
              ) : (
                <CreditCard color="#64748b" size={16} strokeWidth={2.2} />
              )
            }
            keyboardType="decimal-pad"
            label={secondaryAmountLabel}
            onChangeText={setSecondaryAmount}
            placeholder="0.00"
            value={secondaryAmount}
          />
        )}
        {resource === "liability" && (
          <AccountInputField
            icon={<Percent color="#64748b" size={16} strokeWidth={2.2} />}
            keyboardType="decimal-pad"
            label="Interest rate"
            onChangeText={setRate}
            placeholder="e.g. 12.5"
            value={rate}
          />
        )}
        {resource === "loan" && (
          <AccountInputField
            icon={<Hash color="#64748b" size={16} strokeWidth={2.2} />}
            keyboardType="number-pad"
            label="Remaining payments"
            onChangeText={setPayments}
            placeholder="e.g. 24"
            value={payments}
          />
        )}
        {resource !== "loan" && (
          <AccountInputField
            autoCapitalize="characters"
            icon={<IndianRupee color="#64748b" size={16} strokeWidth={2.4} />}
            label="Currency"
            onChangeText={setCurrency}
            placeholder="INR"
            value={currency}
          />
        )}

        {showDates && (
          <>
            <Text className="mt-1 text-[16px] font-extrabold tracking-[-0.2px] text-ink">3.  Dates</Text>
            <AccountInputField
              icon={
                <CalendarDays color="#64748b" size={16} strokeWidth={2.2} />
              }
              label="Date"
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              value={date}
            />
            {resource === "liability" && (
              <AccountInputField
                icon={
                  <CalendarDays color="#64748b" size={16} strokeWidth={2.2} />
                }
                label="End date"
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                value={endDate}
              />
            )}
          </>
        )}
      </>
    );
  }

  return (
    <>
      <ScrollView contentContainerClassName="gap-[18px] bg-canvas p-5 pb-9">
        <View className="gap-2">
          <Text className="text-[25px] font-black text-ink">Accounts</Text>
          <Text className="text-[13px] leading-[19px] text-secondary">
            The money you use every day — cash, bank accounts, cards, and
            wallets.
          </Text>
        </View>

        <View className="flex-row items-center gap-3 overflow-hidden rounded-[18px] bg-ink px-4 py-3.5">
          <View className="min-w-0 flex-1">
            <Text className="text-[12px] font-extrabold text-[#cbd5e1]">
              Total account balance
            </Text>
            <Text className="mt-[7px] text-[31px] font-extrabold tracking-[-0.5px] text-white tabular-nums">
              {MobileDashboardService.getFormattedBalance(totalAccountBalance)}
            </Text>
            <Text className="mt-3 self-start overflow-hidden rounded-full bg-white/[0.12] px-3 py-1.5 text-[12px] font-semibold text-[#e2e8f0]">
              Cash, bank, cards and wallets
            </Text>
          </View>
          <View className="relative h-[72px] w-[88px] items-center justify-center">
            <View className="absolute right-3.5 top-1 h-[54px] w-[54px] items-center justify-center rounded-[15px] bg-[#dbe4ff]">
              <Landmark color="#0f172a" size={23} strokeWidth={2.6} />
            </View>
            <View
              className="absolute right-0 top-8 h-[30px] w-10 items-center justify-center rounded-lg bg-[#65c783]"
              style={illustrationCardTiltStyle}
            >
              <CreditCard color="#ffffff" size={17} strokeWidth={2.6} />
            </View>
            <View className="absolute bottom-2 right-4 h-[22px] w-[22px] items-center justify-center rounded-[11px] bg-[#e6c84f]">
              <IndianRupee color="#ffffff" size={11} strokeWidth={3} />
            </View>
          </View>
        </View>

        {overview.accounts.length > 0 && (
          <Text style={financeStyles.sectionTitle}>Your accounts</Text>
        )}
        {overview.accounts.length === 0 ? (
          <View
            className="rounded-[18px] bg-elevated p-[15px]"
            style={premiumTheme.shadow.floating}
          >
            <Text className="flex-1 text-[16px] font-black text-ink">
              No accounts yet
            </Text>
            <Text style={financeStyles.muted}>
              Add your cash, bank account, card, or wallet to start tracking
              balances.
            </Text>
            <Pressable
              accessibilityRole="button"
              className="mt-3"
              onPress={openAddAccount}
              style={financeStyles.accountSaveButton}
            >
              <Text style={financeStyles.accountSaveButtonText}>
                Add your first account
              </Text>
            </Pressable>
          </View>
        ) : (
          overview.accounts.map((account) => (
            <AccountCard
              account={account.account as CachedAccount}
              balance={account.currentBalance}
              key={account.account.id}
              onDelete={() =>
                requestDelete(
                  "account",
                  account.account.id ?? "",
                  account.account.name
                )
              }
              onEdit={() => editAccount(account.account as CachedAccount)}
            />
          ))
        )}

        <View
          className="gap-3 rounded-section border border-border bg-white p-3.5"
          style={premiumTheme.shadow.soft}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-ink">
              <TrendingUp color="#ffffff" size={17} strokeWidth={2.6} />
            </View>
            <View className="flex-1">
              <Text className="text-[16px] font-black text-ink">
                Net worth tracking
              </Text>
              <Text className="mt-1 text-[13px] leading-[18px] text-secondary">
                Track your assets and liabilities in one place.
              </Text>
            </View>
            <View className="self-start rounded-full bg-field px-2.5 py-[5px]">
              <Text className="text-[11px] font-extrabold text-secondary">
                Optional
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2.5">
            <CompactMetric
              label="Net worth"
              tone="positive"
              value={overview.netWorth.netWorth}
            />
            <CompactMetric
              label="Debt"
              tone="negative"
              value={overview.netWorth.totalLiabilities}
            />
          </View>

          <View className="mt-0.5 border-b-hairline border-b-border" />
          <Text className="text-[14px] font-extrabold tracking-[-0.2px] text-ink">
            Track your financials
          </Text>
          <View className="flex-row flex-wrap gap-[9px]">
            {advancedResourceTabs.map((tab) => {
              const visual = trackResourceVisuals[tab];
              const Icon = visual.Icon;

              return (
                <Pressable
                  accessibilityRole="button"
                  className={`min-h-9 flex-row items-center gap-[5px] rounded-xl border-[1.2px] border-transparent bg-field px-2.5 ${pressedDim}`}
                  key={tab}
                  onPress={() => openAdvancedForm(tab)}
                >
                  <Icon color={visual.color} size={13} strokeWidth={2.4} />
                  <Text
                    className="text-[12px] font-semibold text-secondary"
                    numberOfLines={1}
                  >
                    {titleCase(tab)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {overview.goals.length > 0 && (
          <>
            <Text style={financeStyles.sectionTitle}>Goals</Text>
            {overview.goals.map((goal) => (
              <ResourceRow
                key={goal.goal.id}
                title={goal.goal.name}
                subtitle={`${titleCase(goal.goal.status)} • ${formatPercent(goal.progressPercentage)}`}
                onEdit={() => loadForEdit("goal", goal.goal as CachedGoal)}
                onDelete={() => requestDelete("goal", goal.goal.id ?? "", goal.goal.name)}
              />
            ))}
          </>
        )}

        {assets.length > 0 && (
          <>
            <Text style={financeStyles.sectionTitle}>Assets</Text>
            {assets.map((asset) => (
              <ResourceRow
                key={asset.id}
                title={asset.name}
                subtitle={`${titleCase(asset.asset_type)} • ${MobileDashboardService.getFormattedBalance(asset.current_valuation)}`}
                onEdit={() => loadForEdit("asset", asset)}
                onDelete={() => requestDelete("asset", asset.id, asset.name)}
              />
            ))}
          </>
        )}

        {liabilities.length > 0 && (
          <>
            <Text style={financeStyles.sectionTitle}>Liabilities</Text>
            {liabilities.map((liability) => (
              <ResourceRow
                key={liability.id}
                title={liability.name}
                subtitle={`${titleCase(liability.liability_type)} • ${MobileDashboardService.getFormattedBalance(liability.outstanding_balance)}`}
                onEdit={() => loadForEdit("liability", liability)}
                onDelete={() => requestDelete("liability", liability.id, liability.name)}
              />
            ))}
          </>
        )}

        {overview.investments.length > 0 && (
          <>
            <Text style={financeStyles.sectionTitle}>Investments</Text>
            {overview.investments.map((investment) => (
              <ResourceRow
                key={investment.investment.id}
                title={investment.investment.symbol}
                subtitle={`${MobileDashboardService.getFormattedBalance(investment.marketValue)} • ${MobileDashboardService.getFormattedBalance(investment.gainLoss)}`}
                onEdit={() =>
                  loadForEdit(
                    "investment",
                    investment.investment as CachedInvestment
                  )
                }
                onDelete={() =>
                  requestDelete(
                    "investment",
                    investment.investment.id ?? "",
                    investment.investment.symbol
                  )
                }
              />
            ))}
          </>
        )}

        {overview.loans.length > 0 && (
          <>
            <Text style={financeStyles.sectionTitle}>Loans</Text>
            {overview.loans.map((loan) => (
              <ResourceRow
                key={loan.loan.id}
                title={titleCase(loan.loan.loan_type)}
                subtitle={`${loan.loan.remaining_payments} payments • ${MobileDashboardService.getFormattedBalance(loan.projectedRemainingPaymentTotal)}`}
                onEdit={() => loadForEdit("loan", loan.loan as CachedLoan)}
                onDelete={() =>
                  requestDelete(
                    "loan",
                    loan.loan.id ?? "",
                    titleCase(loan.loan.loan_type)
                  )
                }
              />
            ))}
          </>
        )}
      </ScrollView>

      <Modal
        animationType="none"
        onRequestClose={closeAccountEdit}
        transparent
        visible={accountModalVisible && resource === "account"}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={financeStyles.modalBackdrop}
        >
          <Pressable
            accessibilityLabel="Close account editor"
            onPress={closeAccountEdit}
            style={financeStyles.modalDismissLayer}
          />
          <MotiView
            animate={{ opacity: 1, translateY: 0 }}
            from={{ opacity: 0, translateY: 36 }}
            style={financeStyles.modalPanel}
            transition={{
              damping: 18,
              mass: 0.8,
              stiffness: 180,
              type: "spring",
            }}
          >
            <ScrollView contentContainerClassName="gap-3.5 p-[18px] pb-[30px]">
              <View className="-mt-1.5 mb-2.5 h-1 w-11 self-center rounded-full bg-[#d6dae2]" />
              <View style={financeStyles.modalHeader}>
                <View className="flex-1">
                  <Text className="text-[24px] font-extrabold tracking-[-0.5px] text-ink">
                    {editing ? "Edit account" : "Add account"}
                  </Text>
                  <Text className="mt-[5px] text-[13.5px] text-secondary">
                    {editing
                      ? `Update the prefilled details for ${
                          (editing as CachedAccount | null)?.name ??
                          "this account"
                        }.`
                      : "Enter the details for the account you want to track."}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close account editor"
                  accessibilityRole="button"
                  disabled={isSavingResource}
                  onPress={closeAccountEdit}
                  style={financeStyles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.6} />
                </Pressable>
              </View>

              <Text className="mt-1 text-[16px] font-extrabold tracking-[-0.2px] text-ink">
                1.  Choose account type
              </Text>
              <View className="flex-row flex-nowrap gap-[9px] pt-[7px]">
                {accountTypeOptions.map((accountType) => (
                  <AccountTypeOption
                    accountType={accountType}
                    active={type === accountType}
                    key={accountType}
                    onPress={() => setType(accountType)}
                  />
                ))}
              </View>

              <Text className="mt-1 text-[16px] font-extrabold tracking-[-0.2px] text-ink">
                2.  Account details
              </Text>
              <AccountInputField
                icon={<Landmark color="#64748b" size={16} strokeWidth={2.2} />}
                label="Account name"
                onChangeText={setName}
                placeholder="e.g. Cash or HDFC Bank"
                value={name}
              />
              <View
                className="min-h-[56px] flex-row items-center gap-[11px] rounded-[16px] border border-border bg-white px-[13px] py-1.5"
                style={premiumTheme.shadow.soft}
              >
                <Text className="absolute -top-[9px] left-3.5 z-[2] rounded bg-white px-1 text-[11px] font-semibold text-secondary">
                  Currency
                </Text>
                <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-field">
                  <IndianRupee color="#64748b" size={16} strokeWidth={2.4} />
                </View>
                <View className="min-w-0 flex-1 justify-center">
                  <Text className="text-[14.5px] font-semibold text-ink">
                    {currency}
                  </Text>
                </View>
              </View>
              <AccountInputField
                icon={<CreditCard color="#64748b" size={16} strokeWidth={2.2} />}
                keyboardType="decimal-pad"
                label="Opening balance"
                onChangeText={setAmount}
                placeholder="0.00"
                value={amount}
              />
              <AccountInputField
                icon={<Building2 color="#64748b" size={16} strokeWidth={2.2} />}
                label="Institution"
                onChangeText={setNotes}
                placeholder="e.g. HDFC, SBI, ICICI"
                value={notes}
              />

              {resource === "account" && error ? (
                <Text style={financeStyles.error}>{error}</Text>
              ) : null}
              <View className="mt-2 flex-row gap-3">
                <Pressable
                  className="min-h-[54px] flex-1 items-center justify-center rounded-[16px] bg-field"
                  disabled={isSavingResource}
                  onPress={closeAccountEdit}
                >
                  <Text className="text-[15px] font-bold text-ink">Cancel</Text>
                </Pressable>
                <Pressable
                  className="min-h-[54px] flex-[1.5] flex-row items-center justify-center gap-2 rounded-[16px] bg-ink"
                  disabled={isSavingResource}
                  onPress={() => void handleSave()}
                  style={
                    isSavingResource
                      ? financeStyles.saveButtonDisabled
                      : undefined
                  }
                >
                  <Text className="text-[15px] font-extrabold text-white">
                    {isSavingResource
                      ? "Saving..."
                      : editing
                        ? "Update Account"
                        : "Add Account"}
                  </Text>
                  {isSavingResource ? null : (
                    <ArrowRight color="#ffffff" size={17} strokeWidth={2.6} />
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </MotiView>
        </KeyboardAvoidingView>
      </Modal>

      <DangerConfirmModal
        busy={isDeletingItem}
        message={
          deletingItem?.kind === "account"
            ? `"${deletingItem?.name}" will be removed permanently. Its transactions keep their history, but the account can't be recovered.`
            : `"${deletingItem?.name}" will be removed permanently. This can't be undone.`
        }
        onCancel={() => setDeletingItem(null)}
        onConfirm={() => void confirmDeleteItem()}
        title={`Delete ${resourceLabels[deletingItem?.kind ?? "account"]}?`}
        visible={deletingItem !== null}
      />

      <Modal
        animationType="none"
        onRequestClose={closeAdvancedForm}
        transparent
        visible={advancedModalVisible}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={financeStyles.modalBackdrop}
        >
          <Pressable
            accessibilityLabel="Close"
            onPress={closeAdvancedForm}
            style={financeStyles.modalDismissLayer}
          />
          <MotiView
            animate={{ opacity: 1, translateY: 0 }}
            from={{ opacity: 0, translateY: 36 }}
            style={financeStyles.modalPanel}
            transition={{
              damping: 18,
              mass: 0.8,
              stiffness: 180,
              type: "spring",
            }}
          >
            <ScrollView contentContainerClassName="gap-3.5 p-[18px] pb-[30px]">
              <View className="-mt-1.5 mb-2.5 h-1 w-11 self-center rounded-full bg-[#d6dae2]" />
              <View style={financeStyles.modalHeader}>
                <View className="flex-1">
                  <Text className="text-[24px] font-extrabold tracking-[-0.5px] text-ink">
                    {editing ? "Edit" : "Add"} {resourceLabels[resource]}
                  </Text>
                  <Text className="mt-[5px] text-[13.5px] text-secondary">
                    {getResourceHelpText(resource)}
                  </Text>
                </View>
                <Pressable
                  disabled={isSavingResource}
                  onPress={closeAdvancedForm}
                  style={financeStyles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.6} />
                </Pressable>
              </View>

              {renderResourceFields()}

              {error && <Text style={financeStyles.error}>{error}</Text>}
              <View className="mt-2 flex-row gap-3">
                <Pressable
                  className="min-h-[54px] flex-1 items-center justify-center rounded-[16px] bg-field"
                  disabled={isSavingResource}
                  onPress={closeAdvancedForm}
                >
                  <Text className="text-[15px] font-bold text-ink">Cancel</Text>
                </Pressable>
                <Pressable
                  className="min-h-[54px] flex-[1.5] flex-row items-center justify-center gap-2 rounded-[16px] bg-ink"
                  disabled={isSavingResource}
                  onPress={handleSave}
                  style={
                    isSavingResource
                      ? financeStyles.saveButtonDisabled
                      : undefined
                  }
                >
                  <Text className="text-[15px] font-extrabold text-white">
                    {isSavingResource
                      ? "Saving..."
                      : `${editing ? "Update" : "Add"} ${titleCase(
                          resourceLabels[resource]
                        )}`}
                  </Text>
                  {isSavingResource ? null : (
                    <ArrowRight color="#ffffff" size={17} strokeWidth={2.6} />
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </MotiView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function ResourceRow({
  onDelete,
  onEdit,
  subtitle,
  title,
}: {
  onDelete: () => void;
  onEdit: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <View
      className="rounded-[18px] bg-elevated p-[15px]"
      style={premiumTheme.shadow.floating}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="flex-1 text-[16px] font-black text-ink">{title}</Text>
          <Text style={financeStyles.muted}>{subtitle}</Text>
        </View>
      </View>
      <View className="mt-3.5 flex-row flex-wrap gap-2.5">
        <Pressable
          className="rounded-full bg-field px-3.5 py-2.5"
          onPress={onEdit}
        >
          <Text className="font-black text-ink">Edit</Text>
        </Pressable>
        <Pressable
          className="rounded-full bg-danger-soft px-3.5 py-2.5"
          onPress={onDelete}
        >
          <Text className="font-black text-danger">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AccountTypeOption({
  accountType,
  active,
  onPress,
}: {
  accountType: AccountType;
  active: boolean;
  onPress: () => void;
}) {
  const visual = getAccountTypeVisual(accountType);
  const Icon = visual.Icon;

  return (
    <Pressable
      className={`relative min-h-[92px] min-w-0 flex-1 items-center justify-center gap-2 rounded-[16px] border-[1.5px] bg-white px-[5px] py-3 ${
        active ? "border-ink" : "border-border"
      }`}
      onPress={onPress}
      style={active ? accountTypeActiveShadowStyle : undefined}
    >
      {active ? (
        <View className="absolute -right-[7px] -top-[7px] z-[1] h-5 w-5 items-center justify-center rounded-full bg-ink">
          <Check color="#ffffff" size={11} strokeWidth={3.2} />
        </View>
      ) : null}
      <View
        className="h-[38px] w-[38px] items-center justify-center rounded-[12px]"
        style={{
          backgroundColor: visual.background,
        }}
      >
        <Icon color={visual.color} size={16} strokeWidth={2.4} />
      </View>
      <Text
        className={`text-center text-[11.5px] ${
          active ? "font-extrabold text-ink" : "font-bold text-secondary"
        }`}
      >
        {titleCase(accountType)}
      </Text>
    </Pressable>
  );
}

function AccountInputField({
  icon,
  label,
  onBlur,
  onFocus,
  placeholder,
  style,
  ...props
}: TextInputProps & {
  icon: ReactNode;
  label: string;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = Boolean(props.value && String(props.value).length > 0);
  const [floatAnim] = useState(
    () => new Animated.Value(hasValue ? 1 : 0)
  );

  useEffect(() => {
    Animated.timing(floatAnim, {
      duration: 160,
      toValue: focused || hasValue ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [floatAnim, focused, hasValue]);

  return (
    <View
      className={`min-h-[56px] flex-row items-center gap-[11px] rounded-[16px] border bg-white px-[13px] py-1.5 ${
        focused ? "border-ink" : "border-border"
      }`}
      style={premiumTheme.shadow.soft}
    >
      {/* Material-style floating label: rests as the placeholder, floats
          onto the top border once the field is focused or filled. */}
      <Animated.Text
        pointerEvents="none"
        style={[
          accountFieldFloatLabelStyle,
          {
            color: floatAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [
                premiumTheme.colors.secondary,
                premiumTheme.colors.ink,
              ],
            }),
            fontSize: floatAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [14.5, 11],
            }),
            left: floatAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [54, 14],
            }),
            top: floatAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [17, -9],
            }),
          },
        ]}
      >
        {label}
      </Animated.Text>
      <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-field">
        {icon}
      </View>
      <View className="min-w-0 flex-1 justify-center">
        <TextInput
          className="min-h-[22px] py-0 text-[14.5px] font-semibold text-ink"
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          placeholder={focused ? placeholder : undefined}
          placeholderTextColor="#9aa4b5"
          style={style}
          {...props}
        />
      </View>
    </View>
  );
}

function AccountCard({
  account,
  balance,
  onDelete,
  onEdit,
}: {
  account: CachedAccount;
  balance: number;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const visual = getAccountTypeVisual(account.account_type);
  const Icon = visual.Icon;

  return (
    <View
      className="gap-3 rounded-section border border-border bg-white p-3.5"
      style={premiumTheme.shadow.soft}
    >
      <View className="flex-row items-center gap-[11px]">
        <View
          className="h-[42px] w-[42px] items-center justify-center rounded-[13px]"
          style={{ backgroundColor: visual.background }}
        >
          <Icon color={visual.color} size={19} strokeWidth={2.3} />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="text-[15.5px] font-extrabold tracking-[-0.3px] text-ink"
            numberOfLines={1}
          >
            {account.name}
          </Text>
          <Text
            className="mt-0.5 text-[12px] font-semibold text-secondary"
            numberOfLines={1}
          >
            {titleCase(account.account_type)}
            {account.institution ? ` · ${account.institution}` : ""}
          </Text>
        </View>
        <View className="ml-1 flex-row gap-2">
          <Pressable
            accessibilityLabel={`Edit ${account.name}`}
            accessibilityRole="button"
            className={`h-8 w-8 items-center justify-center rounded-[10px] bg-field ${pressedDim}`}
            hitSlop={4}
            onPress={onEdit}
          >
            <Pencil
              color={premiumTheme.colors.secondary}
              size={14}
              strokeWidth={2.4}
            />
          </Pressable>
          <Pressable
            accessibilityLabel={`Delete ${account.name}`}
            accessibilityRole="button"
            className={`h-8 w-8 items-center justify-center rounded-[10px] bg-danger-soft ${pressedDim}`}
            hitSlop={4}
            onPress={onDelete}
          >
            <Trash2
              color={premiumTheme.colors.danger}
              size={14}
              strokeWidth={2.4}
            />
          </Pressable>
        </View>
      </View>
      <View className="flex-row items-center justify-between border-t-hairline border-t-divider pt-[11px]">
        <Text className="text-[11.5px] font-semibold text-secondary">
          Current balance
        </Text>
        <Text className="text-[16px] font-extrabold tracking-[-0.3px] text-ink tabular-nums">
          {MobileDashboardService.getFormattedBalance(balance)}
        </Text>
      </View>
    </View>
  );
}

function CompactMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "negative" | "positive";
  value: number;
}) {
  const Icon = tone === "positive" ? TrendingUp : TrendingDown;

  return (
    <View
      className="flex-1 flex-row items-center gap-2.5 rounded-control px-3 py-3"
      style={{
        backgroundColor: tone === "positive" ? "#f2faf4" : "#fdf6ee",
      }}
    >
      <View
        className="h-[34px] w-[34px] items-center justify-center rounded-[11px]"
        style={{
          backgroundColor: tone === "positive" ? "#dcfce7" : "#ffedd5",
        }}
      >
        <Icon
          color={tone === "positive" ? "#16a34a" : "#f97316"}
          size={16}
          strokeWidth={2.5}
        />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[12px] font-bold text-secondary">{label}</Text>
        <Text
          adjustsFontSizeToFit
          className="mt-0.5 text-[15.5px] font-extrabold text-ink tabular-nums"
          minimumFontScale={0.7}
          numberOfLines={1}
        >
          {MobileDashboardService.getFormattedBalance(value)}
        </Text>
      </View>
    </View>
  );
}

