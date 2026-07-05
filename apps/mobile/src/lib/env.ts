export interface MobileEnvironment {
  supabaseUrl: string;
  supabasePublishableKey: string;
}

export function getMobileEnvironment(): MobileEnvironment {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Mobile Supabase environment variables are not configured."
    );
  }

  return {
    supabaseUrl,
    supabasePublishableKey
  };
}
