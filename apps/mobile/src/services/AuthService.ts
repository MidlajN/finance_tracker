import { supabase } from "../lib/supabase";

export class AuthService {
  static async getSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return data.session;
  }

  static async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    return data.session;
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }
}
