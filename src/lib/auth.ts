// Simple authentication service without Supabase Auth
import { supabase } from './supabase';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'employee' | 'admin' | 'owner';
  is_active: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class SimpleAuthService {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

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
      this.currentUser = null;
      localStorage.removeItem('auth_user');
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
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
      } catch {
        localStorage.removeItem('auth_user');
      }
    }

    return null;
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