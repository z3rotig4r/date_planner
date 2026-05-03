import { supabase } from '../services/supabaseClient';

/**
 * Supabase Health Check & Security Diagnostic Tool
 */
export const testSupabase = async () => {
  try {
    console.log('--- 🛡️ Supabase Security & Health Check START ---');

    console.log('🔍 Step 0: Checking Environment Variables...');
    let url = '';
    let key = '';
    
    try {
      url = import.meta.env.VITE_SUPABASE_URL;
      key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      console.log('✅ import.meta.env access successful');
    } catch (e) {
      console.error('❌ Error accessing import.meta.env:', e);
    }

    console.log('⚙️ Configuration Status:');
    console.log('- URL Length:', url ? url.length : 0);
    console.log('- Key Length:', key ? key.length : 0);

    if (!url || !key) {
      console.error('🛑 Supabase configuration is missing or empty. Please check your .env.local file and ensure the dev server was restarted.');
      return;
    }

    console.log('⏳ Step 1: Fetching Auth Session...');
    const sessionResponse = await supabase.auth.getSession();
    console.log('📦 Session Response received');

    if (sessionResponse.error) {
      console.error('❌ Auth Session Error:', sessionResponse.error.message);
    } else {
      const session = sessionResponse.data.session;
      console.log('✅ Auth Session:', session ? `Logged in as ${session.user.email}` : 'Not logged in');
      
      if (!session) {
        console.warn('⚠️ Tests requiring auth will be skipped. Please login to the app first.');
        return;
      }

      const user = session.user;

      console.log('⏳ Step 2: Checking Profile & Couple (RLS Test)...');
      const profileRes = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (profileRes.error) console.error('❌ Profile Error:', profileRes.error.message);
      else console.log('✅ Profile Data:', profileRes.data);

      const coupleRes = await supabase.from('couples').select('*').or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`).maybeSingle();
      if (coupleRes.error) console.error('❌ Couple Error:', coupleRes.error.message);
      else console.log('✅ Couple Data:', coupleRes.data);

      const couple = coupleRes.data;
      if (couple) {
        console.log('⏳ Step 3: Checking Plans (Isolation Test)...');
        const plansRes = await supabase.from('plans').select('*').eq('couple_id', couple.id);
        if (plansRes.error) console.error('❌ Plans Error:', plansRes.error.message);
        else console.log(`✅ Plans found: ${plansRes.data.length} items`);

        console.log('⏳ Step 4: Testing RLS Restriction (Injecting Fake ID)...');
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const { error: rlsError } = await supabase.from('plans').insert([{
          couple_id: fakeId,
          activity: 'RLS Test',
          date: new Date().toISOString().split('T')[0],
          time: '00:00'
        }]);
        
        if (rlsError) console.log('✅ RLS Blocked unauthorized insert (Expected):', rlsError.message);
        else console.error('🚨 SECURITY ALERT: RLS failed to block unauthorized insert!');
      }
    }

    console.log('⏳ Step 5: Testing Real-time Connection...');
    const channel = supabase.channel('health-check')
      .subscribe((status) => {
        console.log(`📡 Real-time Status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time connection established');
          setTimeout(() => supabase.removeChannel(channel), 1000);
        }
      });

    console.log('--- 🛡️ Diagnostic Complete ---');
  } catch (globalError) {
    console.error('❌ CRITICAL ERROR during diagnostics:', globalError);
  }
};

if (typeof window !== 'undefined') {
  console.log('🚀 Supabase Diagnostic Tool loaded. Type "testSupabase()" in console.');
  (window as any).testSupabase = testSupabase;
}
