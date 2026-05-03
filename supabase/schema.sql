-- ===========================================================================================
-- DateSync Consolidated Supabase Schema & Security Policy
-- ===========================================================================================
-- 이 파일은 테이블 생성, RLS 정책 설정, 인증 트리거 로직을 모두 포함하고 있습니다.
-- Supabase SQL Editor에 전체 복사 후 실행(Run)하면 시스템이 최신 보안 상태로 업데이트됩니다.
-- 'relation already exists' 에러를 방지하기 위해 IF NOT EXISTS 및 DROP/CREATE 패턴을 사용합니다.
-- ===========================================================================================

-- 1. 테이블 생성 (없을 경우에만 생성)
-- -------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nickname TEXT,
  avatar_url TEXT,
  invite_code TEXT UNIQUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.couples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_b_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_couple UNIQUE (user_a_id, user_b_id)
);

CREATE TABLE IF NOT EXISTS public.plans (
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

-- 2. RLS(Row Level Security) 활성화
-- -------------------------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 3. RLS 정책 초기화 및 재설정 (보안 강화를 위한 최신 정책 반영)
-- -------------------------------------------------------------------------------------------

-- [Profiles 정책 초기화]
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view partner's profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile search by invite code" ON profiles;
DROP POLICY IF EXISTS "Public profile search" ON profiles;

-- [Profiles 정책 적용]
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Public profile search" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- [Couples 정책 초기화]
DROP POLICY IF EXISTS "Users can view their own couple info" ON couples;
DROP POLICY IF EXISTS "Users can create a couple as user_a" ON couples;
DROP POLICY IF EXISTS "Users can join a couple as user_b" ON couples;
DROP POLICY IF EXISTS "Users can manage their own couple" ON couples;

-- [Couples 정책 적용]
CREATE POLICY "Users can manage their own couple" ON couples FOR ALL 
USING (auth.uid() = user_a_id OR auth.uid() = user_b_id)
WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- [Plans 정책 초기화]
DROP POLICY IF EXISTS "Couples can manage their own plans" ON plans;
DROP POLICY IF EXISTS "Users can view plans of their couple" ON plans;
DROP POLICY IF EXISTS "Users can insert plans for their couple" ON plans;
DROP POLICY IF EXISTS "Users can update plans of their couple" ON plans;
DROP POLICY IF EXISTS "Users can delete plans of their couple" ON plans;

-- [Plans 정책 적용]
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

-- 4. Auth 회원가입 트리거 함수 (보안 강화 및 중복 방지)
-- -------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, invite_code)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)),
    upper(substring(md5(random()::text) from 1 for 6))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 트리거 삭제 및 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
