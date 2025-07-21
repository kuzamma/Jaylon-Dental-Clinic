// Simple authentication service without Supabase Auth
import { supabase } from './supabase';
import { supabaseAuthService, SupabaseUser } from './supabaseAuth';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'employee' | 'admin' | 'owner';
  is_active: boolean;
  authProvider?: 'local' | 'google';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class SimpleAuthService {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];
  private supabaseAuthUnsubscribe: (() => void) | null = null;

  constructor() {
    // Set up Supabase Auth listener for OAuth
    this.setupSupabaseAuthListener();
  }

  // Set up Supabase Auth state listener for OAuth users
  private setupSupabaseAuthListener() {
    this.supabaseAuthUnsubscribe = supabaseAuthService.onAuthStateChange(async (session) => {
      if (session?.user) {
        try {
          console.log('🔐 Supabase Auth session detected, syncing user...');
          
          // Sync OAuth user with our database
          const { user: syncedUser, isNewUser } = await supabaseAuthService.syncUserWithDatabase(session.user);
          
          // Check if user has employee record
          const employeeRecord = await supabaseAuthService.checkEmployeeRecord(session.user.email);
          
          // Set current user
          this.currentUser = {
            ...syncedUser,
            authProvider: 'google'
          };
          
          // Store in localStorage for persistence
          localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
          localStorage.setItem('auth_provider', 'google');
          localStorage.setItem('supabase_session', JSON.stringify(session));
          
          console.log('✅ OAuth user synced successfully:', this.currentUser);
          
          if (isNewUser) {
            console.log('🆕 New OAuth user created');
          }
          
          if (!employeeRecord && syncedUser.role === 'employee') {
            console.log('⚠️ OAuth user has no employee record');
          }
          
          this.notifyListeners();
        } catch (error) {
          console.error('❌ Error syncing OAuth user:', error);
          // Don't set user if sync fails
        }
      } else {
        // OAuth session ended
        const authProvider = localStorage.getItem('auth_provider');
        if (authProvider === 'google') {
          console.log('🔐 Google OAuth session ended');
          this.currentUser = null;
          localStorage.removeItem('auth_user');
          localStorage.removeItem('auth_provider');
          localStorage.removeItem('supabase_session');
          this.notifyListeners();
        }
      }
    });
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback: (user: User | null) => void) {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners of auth state change
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentUser));
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      console.log('🔐 Attempting to authenticate:', email);
      
      const { data, error } = await supabase.rpc('authenticate_user', {
        user_email: email,
        user_password: password
      });

      console.log('📡 Authentication response:', { data, error });

      if (error) {
        console.error('❌ Supabase RPC error:', error);
        return { user: null, error: error.message };
      }

      if (!data || data.length === 0) {
        console.log('🚫 No user found or invalid credentials');
        return { user: null, error: 'Invalid email or password' };
      }

      const userData = data[0];
      console.log('✅ User data received:', userData);
      
      // The function returns user_id which is actually the users.id (primary key)
      this.currentUser = {
        id: userData.user_id, // This is actually users.id from the function
        username: userData.username,
        email: userData.email,
        role: userData.role,
        is_active: userData.is_active
      };

      console.log('👤 Current user set:', this.currentUser);

      // Store in localStorage for persistence
      localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
      
      this.notifyListeners();
      return { user: this.currentUser, error: null };
    } catch (error: any) {
      console.error('💥 Authentication error:', error);
      return { user: null, error: error.message || 'Authentication failed' };
    }
  }

  // Sign out
  async signOut(): Promise<{ error: string | null }> {
    try {
      const authProvider = localStorage.getItem('auth_provider');
      
      // Sign out from appropriate provider
      if (authProvider === 'google') {
        console.log('🔄 Signing out from Google OAuth...');
        await supabaseAuthService.signOut();
      }
      
      this.currentUser = null;
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_provider');
      localStorage.removeItem('supabase_session');
      this.notifyListeners();
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    if (this.currentUser) {
      return this.currentUser;
    }

    // Try to restore from localStorage
    const stored = localStorage.getItem('auth_user');
    const authProvider = localStorage.getItem('auth_provider');
    
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
        
        // If it's a Google OAuth user, verify the session is still valid
        if (authProvider === 'google') {
          this.verifyOAuthSession();
        }
        
        return this.currentUser;
      } catch {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_provider');
        localStorage.removeItem('supabase_session');
      }
    }

    return null;
  }

  // Verify OAuth session is still valid
  private async verifyOAuthSession() {
    try {
      const session = await supabaseAuthService.getCurrentSession();
      if (!session) {
        // Session expired, clear local data
        this.currentUser = null;
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_provider');
        localStorage.removeItem('supabase_session');
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error verifying OAuth session:', error);
    }
  }

  // Clean up listeners
  destroy() {
    if (this.supabaseAuthUnsubscribe) {
      this.supabaseAuthUnsubscribe();
    }
  }

  // Create user with password
  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    role?: 'employee' | 'admin' | 'owner';
  }): Promise<{ userId: string | null; error: string | null }> {
    try {
      console.log('🔄 Creating user with password:', userData.email);
      
      // Generate a new UUID for the user
      const newUserId = crypto.randomUUID();
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: newUserId,
          user_id: null, // Not using Supabase Auth
          username: userData.username,
          email: userData.email,
          password: userData.password,
          role: userData.role || 'employee',
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating user:', error);
        return { userId: null, error: error.message };
      }

      console.log('✅ User created successfully:', data);
      return { userId: data.id, error: null };
    } catch (error: any) {
      console.error('💥 Error in createUser:', error);
      return { userId: null, error: error.message };
    }
  }

  // Update user password
  async updatePassword(userId: string, newPassword: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', userId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Check if user has admin privileges
  isAdmin(user: User | null = this.currentUser): boolean {
    return user?.role === 'admin' || user?.role === 'owner';
  }

  // Check if user has specific role
  hasRole(role: string, user: User | null = this.currentUser): boolean {
    return user?.role === role;
  }
}

export const authService = new SimpleAuthService();