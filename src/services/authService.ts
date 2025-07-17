import { supabase } from '../lib/supabase';

export class AuthService {
  static async signUp(email: string, password: string, userData: {
    username: string;
    role: 'employee' | 'admin' | 'owner';
  }) {
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    // Create user record in our users table
    const { data: userData: userRecord, error: userError } = await supabase
      .from('users')
      .insert({
        user_id: authData.user.id,
        username: userData.username,
        email,
        role: userData.role,
        is_active: true
      })
      .select()
      .single();

    if (userError) throw userError;

    return { user: authData.user, userRecord };
  }

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Get user record from our users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (userError) throw userError;

    return { user: data.user, userRecord };
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;

    if (!user) return null;

    // Get user record from our users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (userError) throw userError;

    return { user, userRecord };
  }

  static async updateUserRole(userId: string, role: 'employee' | 'admin' | 'owner') {
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deactivateUser(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}