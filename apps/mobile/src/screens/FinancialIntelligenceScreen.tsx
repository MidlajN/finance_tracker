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
  Building2,
  CreditCard,
  IndianRupee,
  Landmark,
  Plus,
  X,
} from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
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
    const nextResource = route.params?.initialResource;
    const formIntentId = route.params?.formIntentId;

    if (!nextResource || lastAppliedFormIntentId.current === formIntentId) {
      return;
    }

    lastAppliedFormIntentId.current = formIntentId;
    resetForm(nextResource);
    setAdvancedModalVisible(nextResource !== "account");
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
  }

  function closeAccountEdit() {
    if (!isSavingResource) {
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

  function openAdvancedForm(nextResource: IntelligenceResource) {
    resetForm(nextResource);
    setAdvancedModalVisible(true);
  }

  function closeAdvancedForm() {
    setAdvancedModalVisible(false);
    resetForm("account");
  }

  function renderResourceFields() {
    return (
      <>
        {resource !== "loan" && (
          <TextInput
            onChangeText={setName}
            placeholder={getNamePlaceholder(resource)}
            style={styles.input}
            value={name}
          />
        )}
        {["asset", "liability", "loan"].includes(resource) && (
          <TextInput
            onChangeText={setType}
            placeholder={getTypePlaceholder(resource)}
            style={styles.input}
            value={type}
          />
        )}
        {resource !== "loan" && (
          <TextInput
            onChangeText={setCurrency}
            placeholder="Currency"
            style={styles.input}
            value={currency}
          />
        )}
        {resource === "loan" && (
          <TextInput
            onChangeText={setLiabilityId}
            placeholder="Linked liability ID"
            style={styles.input}
            value={liabilityId}
          />
        )}
        {["asset", "investment"].includes(resource) && (
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setQuantity}
            placeholder="Quantity"
            style={styles.input}
            value={quantity}
          />
        )}
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setAmount}
          placeholder={
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
                      : "Target amount"
          }
          style={styles.input}
          value={amount}
        />
        {["asset", "liability", "loan", "investment"].includes(resource) && (
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setSecondaryAmount}
            placeholder={
              resource === "asset"
                ? "Acquisition value"
                : resource === "liability"
                  ? "Original amount"
                  : resource === "loan"
                    ? "Interest accrued"
                    : "Current price"
            }
            style={styles.input}
            value={secondaryAmount}
          />
        )}
        {resource === "liability" && (
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setRate}
            placeholder="Interest rate"
            style={styles.input}
            value={rate}
          />
        )}
        {resource === "loan" && (
          <TextInput
            keyboardType="number-pad"
            onChangeText={setPayments}
            placeholder="Remaining payments"
            style={styles.input}
            value={payments}
          />
        )}
        {["asset", "liability", "goal"].includes(resource) && (
          <TextInput
            onChangeText={setDate}
            placeholder="Date"
            style={styles.input}
            value={date}
          />
        )}
        {resource === "liability" && (
          <TextInput
            onChangeText={setEndDate}
            placeholder="End date"
            style={styles.input}
            value={endDate}
          />
        )}
        {resource === "goal" && (
          <TextInput
            onChangeText={(value) => setStatus(value as GoalStatus)}
            placeholder="Status"
            style={styles.input}
            value={status}
          />
        )}
        {resource === "investment" && (
          <TextInput
            onChangeText={setExchange}
            placeholder="Exchange"
            style={styles.input}
            value={exchange}
          />
        )}
        {["account", "asset"].includes(resource) && (
          <TextInput
            onChangeText={setNotes}
            placeholder={resource === "account" ? "Institution" : "Notes"}
            style={styles.input}
            value={notes}
          />
        )}
      </>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.addAccountHeader}>
          <Text style={styles.addAccountTitle}>Add Account</Text>
          <Text style={styles.pageIntro}>
            Start with the money you use every day. Add cash, bank accounts,
            cards, or wallets before turning on optional net worth tracking.
          </Text>
        </View>

        <View style={styles.accountBalanceCard}>
          <View style={styles.accountBalanceCopy}>
            <Text style={styles.accountBalanceLabel}>Total account balance</Text>
            <Text style={styles.accountBalanceValue}>
              {MobileDashboardService.getFormattedBalance(totalAccountBalance)}
            </Text>
            <Text style={styles.accountBalanceHint}>
              Cash, bank, cards and wallets
            </Text>
          </View>
          <View style={styles.balanceIllustration}>
            <View style={styles.illustrationBank}>
              <Landmark color="#0f172a" size={23} strokeWidth={2.6} />
            </View>
            <View style={styles.illustrationCard}>
              <CreditCard color="#ffffff" size={17} strokeWidth={2.6} />
            </View>
            <View style={styles.illustrationCoin}>
              <IndianRupee color="#ffffff" size={11} strokeWidth={3} />
            </View>
          </View>
        </View>

        <View style={styles.accountFormCard}>
          <View style={styles.accountFormModeHeader}>
            <View style={styles.accountFormModeCopy}>
              <Text style={styles.accountFormModeTitle}>New account</Text>
              <Text style={styles.accountFormModeText}>
                Enter the details for the account you want to track.
              </Text>
            </View>
          </View>

          <Text style={styles.accountSectionLabel}>Choose account type</Text>
          <View style={styles.accountTypeGrid}>
            {accountTypeOptions.map((accountType) => (
              <AccountTypeOption
                accountType={accountType}
                active={type === accountType}
                key={accountType}
                onPress={() => setType(accountType)}
              />
            ))}
          </View>

          <View style={styles.accountDivider} />
          <Text style={styles.accountSectionLabel}>Account details</Text>

          <AccountInputField
            icon={<Landmark color="#7b8494" size={18} strokeWidth={2.2} />}
            onChangeText={setName}
            placeholder="Account name"
            supportingText="e.g. Cash or HDFC Bank"
            value={name}
          />
          <AccountInputField
            icon={<IndianRupee color="#7b8494" size={18} strokeWidth={2.4} />}
            onChangeText={setCurrency}
            placeholder="Currency"
            value={currency}
          />
          <AccountInputField
            icon={<CreditCard color="#7b8494" size={18} strokeWidth={2.2} />}
            keyboardType="decimal-pad"
            onChangeText={setAmount}
            placeholder="Opening balance"
            value={amount}
          />
          <AccountInputField
            icon={<Building2 color="#7b8494" size={18} strokeWidth={2.2} />}
            onChangeText={setNotes}
            placeholder="Institution"
            value={notes}
          />
          {resource === "account" && error && <Text style={financeStyles.error}>{error}</Text>}
          <View style={styles.accountFormActions}>
            <Pressable
              disabled={isSavingResource}
              onPress={() => {
                setResource("account");
                void handleSave();
              }}
              style={[
                financeStyles.accountSaveButton,
                isSavingResource && financeStyles.saveButtonDisabled,
              ]}
            >
              <Text style={financeStyles.accountSaveButtonText}>
                {isSavingResource ? "Saving..." : "Add Account"}
              </Text>
            </Pressable>
          </View>
        </View>

        {overview.accounts.length > 0 && (
          <Text style={financeStyles.sectionTitle}>Your accounts</Text>
        )}
        {overview.accounts.length === 0 ? (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>No accounts yet</Text>
            <Text style={financeStyles.muted}>
              Add your cash, bank account, card, or wallet to start tracking
              balances.
            </Text>
          </View>
        ) : (
          overview.accounts.map((account) => (
            <ResourceRow
              key={account.account.id}
              title={account.account.name}
              subtitle={`${titleCase(account.account.account_type)} • ${MobileDashboardService.getFormattedBalance(account.currentBalance)}`}
              onEdit={() => editAccount(account.account as CachedAccount)}
              onDelete={() =>
                void handleDelete("account", account.account.id ?? "")
              }
            />
          ))
        )}

        <View style={styles.optionalSection}>
          <View style={styles.optionalHeader}>
            <View style={styles.rowTitleBlock}>
              <Text style={styles.optionalTitle}>Net worth tracking</Text>
              <Text style={styles.optionalText}>
                Add assets, debt, investments, loans, or goals when you want a
                fuller financial picture.
              </Text>
            </View>
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalBadgeText}>Optional</Text>
            </View>
          </View>
          <View style={styles.compactMetricRow}>
            <CompactMetric
              label="Net worth"
              value={overview.netWorth.netWorth}
            />
            <CompactMetric
              label="Debt"
              value={overview.netWorth.totalLiabilities}
            />
          </View>
          <View style={styles.optionalActions}>
            {advancedResourceTabs.map((tab) => (
              <Pressable
                key={tab}
                onPress={() => openAdvancedForm(tab)}
                style={styles.advancedPill}
              >
                <Plus color="#334155" size={14} strokeWidth={2.8} />
                <Text style={styles.segmentText}>{titleCase(tab)}</Text>
              </Pressable>
            ))}
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
                onDelete={() => void handleDelete("goal", goal.goal.id ?? "")}
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
                onDelete={() => void handleDelete("asset", asset.id)}
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
                onDelete={() => void handleDelete("liability", liability.id)}
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
                  void handleDelete("investment", investment.investment.id ?? "")
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
                onDelete={() => void handleDelete("loan", loan.loan.id ?? "")}
              />
            ))}
          </>
        )}
      </ScrollView>

      <Modal
        animationType="none"
        onRequestClose={closeAccountEdit}
        transparent
        visible={Boolean(editing && resource === "account")}
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
            transition={{ duration: 220, type: "timing" }}
          >
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={financeStyles.modalHeader}>
                <View style={styles.rowTitleBlock}>
                  <Text style={financeStyles.sectionTitle}>Edit account</Text>
                  <Text style={financeStyles.muted}>
                    Update the prefilled details for{" "}
                    {(editing as CachedAccount | null)?.name ?? "this account"}.
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

              <Text style={styles.accountSectionLabel}>Choose account type</Text>
              <View style={styles.accountTypeGrid}>
                {accountTypeOptions.map((accountType) => (
                  <AccountTypeOption
                    accountType={accountType}
                    active={type === accountType}
                    key={accountType}
                    onPress={() => setType(accountType)}
                  />
                ))}
              </View>

              <View style={styles.accountDivider} />
              <Text style={styles.accountSectionLabel}>Account details</Text>
              <AccountInputField
                icon={<Landmark color="#7b8494" size={18} strokeWidth={2.2} />}
                onChangeText={setName}
                placeholder="Account name"
                supportingText="e.g. Cash or HDFC Bank"
                value={name}
              />
              <AccountInputField
                icon={<IndianRupee color="#7b8494" size={18} strokeWidth={2.4} />}
                onChangeText={setCurrency}
                placeholder="Currency"
                value={currency}
              />
              <AccountInputField
                icon={<CreditCard color="#7b8494" size={18} strokeWidth={2.2} />}
                keyboardType="decimal-pad"
                onChangeText={setAmount}
                placeholder="Opening balance"
                value={amount}
              />
              <AccountInputField
                icon={<Building2 color="#7b8494" size={18} strokeWidth={2.2} />}
                onChangeText={setNotes}
                placeholder="Institution"
                value={notes}
              />

              {resource === "account" && error ? (
                <Text style={financeStyles.error}>{error}</Text>
              ) : null}
              <View style={styles.actions}>
                <Pressable
                  disabled={isSavingResource}
                  onPress={() => void handleSave()}
                  style={[
                    styles.primaryButton,
                    isSavingResource && financeStyles.saveButtonDisabled,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {isSavingResource ? "Saving..." : "Update Account"}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={isSavingResource}
                  onPress={closeAccountEdit}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </MotiView>
        </KeyboardAvoidingView>
      </Modal>

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
            transition={{ duration: 220, type: "timing" }}
          >
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={financeStyles.modalHeader}>
                <View style={styles.rowTitleBlock}>
                  <Text style={financeStyles.sectionTitle}>
                    {editing ? "Edit" : "Add"} {resourceLabels[resource]}
                  </Text>
                  <Text style={financeStyles.muted}>{getResourceHelpText(resource)}</Text>
                </View>
                <Pressable
                  onPress={closeAdvancedForm}
                  style={financeStyles.modalCloseButton}
                >
                  <X color="#0f172a" size={20} strokeWidth={2.6} />
                </Pressable>
              </View>

              {renderResourceFields()}

              {error && <Text style={financeStyles.error}>{error}</Text>}
              <View style={styles.actions}>
                <Pressable
                  disabled={isSavingResource}
                  onPress={handleSave}
                  style={[
                    styles.primaryButton,
                    isSavingResource && financeStyles.saveButtonDisabled,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {isSavingResource
                      ? "Saving..."
                      : `Save ${resourceLabels[resource]}`}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={closeAdvancedForm}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
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
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={styles.rowTitleBlock}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={financeStyles.muted}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onEdit} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Edit</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.dangerButton}>
          <Text style={styles.dangerButtonText}>Delete</Text>
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
      onPress={onPress}
      style={[styles.accountTypeCard, active && styles.accountTypeCardActive]}
    >
      <View
        style={[
          styles.accountTypeIcon,
          {
            backgroundColor: visual.background,
          },
        ]}
      >
        <Icon
          color={active ? "#0f172a" : visual.color}
          size={16}
          strokeWidth={2.6}
        />
      </View>
      <Text
        style={[
          styles.accountTypeText,
          active && styles.accountTypeTextActive,
        ]}
      >
        {titleCase(accountType)}
      </Text>
    </Pressable>
  );
}

function AccountInputField({
  icon,
  supportingText,
  style,
  ...props
}: TextInputProps & {
  icon: ReactNode;
  supportingText?: string;
}) {
  return (
    <View style={styles.accountInputRow}>
      <View style={styles.accountInputIcon}>{icon}</View>
      <View style={styles.accountInputTextBlock}>
        <TextInput
          placeholderTextColor="#737d8c"
          style={[styles.accountInput, style]}
          {...props}
        />
        {supportingText && !props.value ? (
          <Text style={styles.accountInputSupport}>{supportingText}</Text>
        ) : null}
      </View>
    </View>
  );
}

function CompactMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.compactMetric}>
      <Text style={styles.compactMetricLabel}>{label}</Text>
      <Text style={styles.compactMetricValue}>
        {MobileDashboardService.getFormattedBalance(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  accountBalanceCard: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accountBalanceCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountBalanceHint: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
  },
  accountBalanceLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "800",
  },
  accountBalanceValue: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 7,
  },
  accountDivider: {
    backgroundColor: "#eef2f7",
    height: 1,
  },
  accountFormActions: {
    marginTop: 12,
  },
  accountFormCard: {
    backgroundColor: premiumTheme.colors.elevated,
    borderRadius: premiumTheme.radius.section,
    gap: 12,
    padding: 14,
    ...premiumTheme.shadow.raised,
  },
  accountFormModeCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountFormModeHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  accountFormModeText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  accountFormModeTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },
  accountInput: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
    minHeight: 20,
    paddingVertical: 0,
  },
  accountInputIcon: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.canvas,
    borderRadius: 11,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  accountInputRow: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  accountInputSupport: {
    color: "#9aa4b5",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  accountInputTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  accountSectionLabel: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  accountTypeCard: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    flex: 1,
    gap: 5,
    justifyContent: "center",
    minHeight: 66,
    minWidth: 0,
    paddingHorizontal: 5,
    paddingVertical: 8,
  },
  accountTypeCardActive: {
    backgroundColor: premiumTheme.colors.accentSoft,
    shadowColor: premiumTheme.colors.accent,
    shadowOffset: {
      height: 4,
      width: 0,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  accountTypeGrid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
  },
  accountTypeIcon: {
    alignItems: "center",
    borderRadius: 11,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  accountTypeText: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  accountTypeTextActive: {
    color: "#0f172a",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  addAccountHeader: {
    gap: 8,
  },
  addAccountTitle: {
    color: "#0f172a",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
  },
  advancedPill: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 12,
  },
  balanceIllustration: {
    alignItems: "center",
    height: 72,
    justifyContent: "center",
    position: "relative",
    width: 88,
  },
  compactMetric: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  compactMetricLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
  },
  compactMetricRow: {
    flexDirection: "row",
    gap: 10,
  },
  compactMetricValue: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 3,
  },
  container: {
    backgroundColor: premiumTheme.colors.canvas,
    gap: 18,
    padding: 20,
    paddingBottom: 36,
  },
  dangerButton: {
    backgroundColor: premiumTheme.colors.dangerSoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dangerButtonText: {
    color: "#dc2626",
    fontWeight: "900",
  },
  illustrationBank: {
    alignItems: "center",
    backgroundColor: "#dbe4ff",
    borderRadius: 15,
    height: 54,
    justifyContent: "center",
    position: "absolute",
    right: 14,
    top: 4,
    width: 54,
  },
  illustrationCard: {
    alignItems: "center",
    backgroundColor: "#65c783",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: 32,
    transform: [{ rotate: "8deg" }],
    width: 40,
  },
  illustrationCoin: {
    alignItems: "center",
    backgroundColor: "#e6c84f",
    borderRadius: 11,
    bottom: 8,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    width: 22,
  },
  input: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 16,
    color: "#0f172a",
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 15,
  },
  modalContent: {
    gap: 14,
    padding: 18,
    paddingBottom: 30,
  },
  optionalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionalBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  optionalBadgeText: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: "900",
  },
  optionalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  optionalSection: {
    backgroundColor: premiumTheme.colors.elevated,
    borderRadius: 18,
    gap: 12,
    padding: 14,
    ...premiumTheme.shadow.floating,
  },
  optionalText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  optionalTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  pageIntro: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: 999,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  row: {
    backgroundColor: premiumTheme.colors.elevated,
    borderRadius: 18,
    padding: 15,
    ...premiumTheme.shadow.floating,
  },
  rowHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  rowTitle: {
    color: "#0f172a",
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  rowTitleBlock: {
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "900",
  },
  segmentText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
});
