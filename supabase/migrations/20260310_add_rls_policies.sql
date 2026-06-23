-- ============================================================
-- Admin-Only RLS Policies for recipes table
-- Only the admin user (identified by email) can INSERT/UPDATE/DELETE.
-- Anyone can SELECT published recipes.
-- ============================================================

-- Step 1: Enable Row Level Security
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Step 2: Create a helper function to check if the current user is an admin
-- This checks the JWT claims for the user's email.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'email' = 'anuthekkel@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: RLS Policies (Clean up old ones first to prevent errors)

DROP POLICY IF EXISTS "Anyone can read published recipes" ON recipes;
-- PUBLIC READ: Anyone (even unauthenticated) can read published recipes
CREATE POLICY "Anyone can read published recipes"
  ON recipes FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Admin can insert recipes" ON recipes;
-- ADMIN INSERT: Only the admin can add new recipes
CREATE POLICY "Admin can insert recipes"
  ON recipes FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update recipes" ON recipes;
-- ADMIN UPDATE: Only the admin can update recipes
CREATE POLICY "Admin can update recipes"
  ON recipes FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can delete recipes" ON recipes;
-- ADMIN DELETE: Only the admin can delete recipes
CREATE POLICY "Admin can delete recipes"
  ON recipes FOR DELETE
  USING (is_admin());
