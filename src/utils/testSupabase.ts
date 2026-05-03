import { supabase } from '../services/supabaseClient';

/**
 * Supabase Health Check & Security Diagnostic Tool
 * This can be called from the browser console for E2E testing.
 */
export const testSupabase = async () => {
  console.log('--- 🛡️ Supabase Security & Health Check ---');

  // 1. Auth Session Check
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError) {
    console.error('❌ Auth Session Error:', authError.message);
  } else {
    console.log('✅ Auth Session:', session ? `Logged in as ${session.user.email}` : 'Not logged in');
  }

  const user = session?.user;
  if (!user) {
    console.warn('⚠️ Tests requiring auth will be skipped. Please login first.');
    return;
  }

  // 2. Current User Profile & Couple Check
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('❌ Profile Fetch Error (Check RLS):', profileError.message);
  } else {
    console.log('✅ My Profile:', profile);
  }

  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .select('*')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .maybeSingle();

  if (coupleError) {
    console.error('❌ Couple Fetch Error (Check RLS):', coupleError.message);
  } else {
    console.log('✅ My Couple Info:', couple || 'No couple connected');
  }

  // 3. RLS Isolation Test (Attempting to access data without proper couple context)
  if (couple) {
    console.log('🛠️ Testing RLS Isolation on Plans...');
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .eq('couple_id', couple.id);

    if (plansError) {
      console.error('❌ Plans Fetch Error:', plansError.message);
    } else {
      console.log(`✅ Plans Access Success: Found ${plans.length} items`);
    }

    // Try to insert a plan for a fake couple ID to test RLS CHECK constraint
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const { error: rlsViolationTest } = await supabase
      .from('plans')
      .insert([{
        couple_id: fakeId,
        activity: 'Malicious Hack',
        date: new Date().toISOString().split('T')[0],
        time: '00:00'
      }]);
    
    if (rlsViolationTest) {
      console.log('✅ RLS Blocked unauthorized insert (as expected):', rlsViolationTest.message);
    } else {
      console.error('🚨 SECURITY VULNERABILITY: RLS failed to block unauthorized insert!');
    }
  }

  // 4. Real-time Channel Diagnostic
  console.log('📡 Testing Real-time Channel...');
  const channel = supabase.channel('health-check')
    .on('system', { event: '*' }, (payload) => console.log('Real-time Event:', payload))
    .subscribe((status) => {
      console.log(`✅ Real-time Subscription Status: ${status}`);
      if (status === 'SUBSCRIBED') {
        setTimeout(() => supabase.removeChannel(channel), 1000);
      }
    });

  console.log('--- 🛡️ Diagnostic Complete ---');
};

// Expose to window for easy console access
if (typeof window !== 'undefined') {
  console.log('🚀 Supabase Diagnostic Tool loaded. Type "testSupabase()" in console to run.');
  (window as any).testSupabase = testSupabase;
}
