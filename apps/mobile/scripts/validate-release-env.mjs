const productionVariables = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
];

const signingVariables = [
  "FINANCE_ANDROID_KEYSTORE_FILE",
  "FINANCE_ANDROID_KEYSTORE_PASSWORD",
  "FINANCE_ANDROID_KEY_ALIAS",
  "FINANCE_ANDROID_KEY_PASSWORD"
];

function hasValue(name) {
  return typeof process.env[name] === "string" && process.env[name].trim() !== "";
}

const missingProductionVariables = productionVariables.filter(
  (name) => !hasValue(name)
);

const providedSigningVariables = signingVariables.filter(hasValue);
const missingSigningVariables = signingVariables.filter((name) => !hasValue(name));

const errors = [];

if (missingProductionVariables.length > 0) {
  errors.push(
    `Missing production environment variables: ${missingProductionVariables.join(", ")}`
  );
}

if (
  providedSigningVariables.length > 0 &&
  missingSigningVariables.length > 0
) {
  errors.push(
    `Android release signing must be configured as a complete set. Missing: ${missingSigningVariables.join(", ")}`
  );
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Mobile release environment is configured.");
