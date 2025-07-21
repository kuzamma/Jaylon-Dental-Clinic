import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

// Create a separate client for Supabase Auth
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

export interface SupabaseUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    name?: string;
  };
  app_metadata: {
    provider?: string;
  };
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: SupabaseUser;
}

class SupabaseAuthService {
  private listeners: ((session: AuthSession | null) => void)[] = [];

  // Subscribe to auth state changes
  onAuthStateChange(callback: (session: AuthSession | null) => void) {
    this.listeners.push(callback);
    
    // Set up Supabase auth listener
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Supabase Auth State Change:', event, session?.user?.email);
      callback(session as AuthSession | null);
      
      // Notify all listeners
      this.listeners.forEach(listener => listener(session as AuthSession | null));
    });

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Sign in with Google OAuth
  async signInWithGoogle() {
    try {
      console.log('🔄 Initiating Google OAuth sign-in...');
      
      const { data, error } = await supabaseAuth.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        console.error('❌ Google OAuth error:', error);
        throw error;
      }

      console.log('✅ Google OAuth initiated successfully');
      return { data, error: null };
    } catch (error: any) {
      console.error('💥 Google sign-in error:', error);
      return { data: null, error: error.message };
    }
  }

  // Get current session
  async getCurrentSession(): Promise<AuthSession | null> {
    try {
      const { data: { session }, error } = await supabaseAuth.auth.getSession();
      
      if (error) {
        console.error('❌ Error getting session:', error);
        return null;
      }

      return session as AuthSession | null;
    } catch (error) {
      console.error('💥 Error getting current session:', error);
      return null;
    }
  }

  // Get current user
  async getCurrentUser(): Promise<SupabaseUser | null> {
    try {
      const { data: { user }, error } = await supabaseAuth.auth.getUser();
      
      if (error) {
        console.error('❌ Error getting user:', error);
        return null;
      }

      return user as SupabaseUser | null;
    } catch (error) {
      console.error('💥 Error getting current user:', error);
      return null;
    }
  }

  // Sign out
  async signOut() {
    try {
      console.log('🔄 Signing out from Supabase Auth...');
      
      const { error } = await supabaseAuth.auth.signOut();
      
      if (error) {
        console.error('❌ Sign out error:', error);
        throw error;
      }

      console.log('✅ Successfully signed out from Supabase Auth');
      return { error: null };
    } catch (error: any) {
      console.error('💥 Sign out error:', error);
      return { error: error.message };
    }
  }

  // Create or update user in our system after OAuth login
  async syncUserWithDatabase(supabaseUser: SupabaseUser) {
    try {
      console.log('🔄 Syncing OAuth user with database:', supabaseUser.email);
      
      // Check if user already exists in our system
      const { data: existingUser, error: fetchError } = await supabaseAuth
        .from('users')
        .select('*')
        .eq('email', supabaseUser.email)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw fetchError;
      }

      if (existingUser) {
        // User exists, update their info
        console.log('✅ User exists, updating info...');
        
        const { data: updatedUser, error: updateError } = await supabaseAuth
          .from('users')
          .update({
            username: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('email', supabaseUser.email)
          .select()
          .single();

        if (updateError) throw updateError;
        
        return {
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
            is_active: updatedUser.is_active
          },
          isNewUser: false
        };
      } else {
        // New user, create account
        console.log('🆕 Creating new user account...');
        
        const newUserId = crypto.randomUUID();
        const username = supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0];
        
        const { data: newUser, error: createError } = await supabaseAuth
          .from('users')
          .insert({
            id: newUserId,
            username: username,
            email: supabaseUser.email,
            password: 'oauth_user', // Placeholder for OAuth users
            role: 'employee', // Default role for new OAuth users
            is_active: true
          })
          .select()
          .single();

        if (createError) throw createError;

        return {
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            is_active: newUser.is_active
          },
          isNewUser: true
        };
      }
    } catch (error: any) {
      console.error('💥 Error syncing user with database:', error);
      throw error;
    }
  }

  // Check if user has employee record
  async checkEmployeeRecord(userEmail: string) {
    try {
      const { data: employee, error } = await supabaseAuth
        .from('employees')
        .select('*')
        .eq('email_address', userEmail)
        .eq('status', 'Active')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return employee;
    } catch (error: any) {
      console.error('Error checking employee record:', error);
      return null;
    }
  }
}

export const supabaseAuthService = new SupabaseAuthService();