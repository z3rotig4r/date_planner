-- 1. Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nickname TEXT,
  avatar_url TEXT,
  invite_code TEXT UNIQUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Couples Table
CREATE TABLE couples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_b_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_couple UNIQUE (user_a_id, user_b_id)
);

-- 3. Plans Table
CREATE TABLE plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  activity TEXT NOT NULL,
  location TEXT,
  link TEXT,
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'accepted', 'rejected', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Profiles
-- Users can always see their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
-- Users can see their partner's profile
CREATE POLICY "Users can view partner's profile" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM couples 
    WHERE (couples.user_a_id = auth.uid() AND couples.user_b_id = profiles.id)
       OR (couples.user_b_id = auth.uid() AND couples.user_a_id = profiles.id)
  )
);
-- Allow finding profiles by invite_code (restricted view)
CREATE POLICY "Allow profile search by invite code" ON profiles FOR SELECT USING (true); 
-- NOTE: In a production environment, you might want to create a separate view or RPC for searching 
-- to avoid exposing avatar_url or other data until they are connected.

CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for Couples
CREATE POLICY "Users can view their own couple info" ON couples FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
CREATE POLICY "Users can create a couple as user_a" ON couples FOR INSERT WITH CHECK (auth.uid() = user_a_id);
CREATE POLICY "Users can join a couple as user_b" ON couples FOR UPDATE USING (auth.uid() = user_b_id);

-- RLS Policies for Plans
CREATE POLICY "Users can view plans of their couple" ON plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM couples WHERE couples.id = plans.couple_id AND (couples.user_a_id = auth.uid() OR couples.user_b_id = auth.uid()))
);
CREATE POLICY "Users can insert plans for their couple" ON plans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM couples WHERE couples.id = plans.couple_id AND (couples.user_a_id = auth.uid() OR couples.user_b_id = auth.uid()))
);
CREATE POLICY "Users can update plans of their couple" ON plans FOR UPDATE USING (
  EXISTS (SELECT 1 FROM couples WHERE couples.id = plans.couple_id AND (couples.user_a_id = auth.uid() OR couples.user_b_id = auth.uid()))
);
CREATE POLICY "Users can delete plans of their couple" ON plans FOR DELETE USING (
  EXISTS (SELECT 1 FROM couples WHERE couples.id = plans.couple_id AND (couples.user_a_id = auth.uid() OR couples.user_b_id = auth.uid()))
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, invite_code)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'nickname',
    upper(substring(md5(random()::text) from 1 for 6))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
