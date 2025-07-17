# 🔧 Admin User Setup Guide

## 🚨 **CRITICAL: The Issue Explained**

The error occurs because of a **foreign key constraint mismatch**:

- The `owners` table has a foreign key `user_id` that references `users.id` 
- But we were trying to insert the `auth.users.id` directly
- These are **different UUIDs**!

## ✅ **CORRECT Setup Process**

### Step 1: Create Auth User in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add User"**
3. Enter:
   - **Email:** `admin@jaylondental.com`
   - **Password:** `admin123`
   - ✅ Check **"Email Confirm"**
4. Click **"Create User"**
5. **Copy the generated UUID** (this is the `auth.users.id`)

### Step 2: Run the New Migration

In Supabase SQL Editor, run:
```sql
-- This file: 20250628093000_fix_foreign_key.sql
```

### Step 3: Create Admin Records

**Option A: If you have the auth user UUID**
```sql
SELECT create_admin_user_record('PASTE_AUTH_USER_UUID_HERE');
```

**Option B: Automatic detection**
```sql
SELECT setup_admin_if_exists();
```

### Step 4: Verify Setup

```sql
SELECT * FROM debug_admin_setup();
```

You should see:
- `auth.users`: 1 record
- `users`: 1 record  
- `owners`: 1 record

## 🔍 **Understanding the Fix**

The new migration creates the correct relationship:

1. **Auth User** (`auth.users`) ← Created in Supabase Dashboard
2. **User Record** (`users`) ← References `auth.users.id` in `user_id` field
3. **Owner Record** (`owners`) ← References `users.id` in `user_id` field

**Before (WRONG):**
```
owners.user_id → auth.users.id (DIRECT - CAUSES ERROR)
```

**After (CORRECT):**
```
auth.users.id → users.user_id → users.id → owners.user_id
```

## 🚨 **If You Still Get Errors**

1. **Check if auth user exists:**
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'admin@jaylondental.com';
   ```

2. **If no auth user, create one in Supabase Dashboard first!**

3. **Clear everything and start fresh:**
   ```sql
   DELETE FROM owners WHERE email = 'admin@jaylondental.com';
   DELETE FROM users WHERE email = 'admin@jaylondental.com';
   -- Then run setup again
   ```

4. **Check foreign key constraints:**
   ```sql
   SELECT 
     tc.table_name, 
     kcu.column_name, 
     ccu.table_name AS foreign_table_name,
     ccu.column_name AS foreign_column_name 
   FROM information_schema.table_constraints AS tc 
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY' 
     AND tc.table_name = 'owners';
   ```

## ✅ **Success Indicators**

When setup is successful, you'll see:
- ✅ `SUCCESS: Admin user records created. Auth ID: [uuid], User Record ID: [uuid]`
- ✅ Debug shows 1 record in each table
- ✅ Login works with `admin@jaylondental.com` / `admin123`

## 🎯 **The Key Insight**

The `owners.user_id` field is a foreign key to `users.id`, **NOT** to `auth.users.id`. This is why we need to:

1. Create the `users` record first (which gets its own UUID)
2. Use that `users.id` UUID for the `owners.user_id` field

This maintains proper relational integrity! 🎉