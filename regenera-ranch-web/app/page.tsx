import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveCampoCookieServer } from '@/lib/activeCampo';
import { Dashboard } from '@/components/Dashboard';
import { Onboarding } from '@/components/Onboarding';
import type { Campo, Potrero } from '@regenera/shared';

export default async function HomePage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: campos } = await supabase
    .from('campos')
    .select('*')
    .order('created_at', { ascending: true });

  if (!campos || campos.length === 0) {
    return <Onboarding />;
  }

  const activeId = await getActiveCampoCookieServer();
  const activeCampo: Campo =
    campos.find((c) => c.id === activeId) ?? campos[0];

  const { data: potreros } = await supabase
    .from('potreros')
    .select('*')
    .eq('campo_id', activeCampo.id)
    .order('name', { ascending: true });

  return (
    <Dashboard
      user={{ id: user.id, email: user.email ?? '' }}
      campos={campos}
      activeCampo={activeCampo}
      potreros={(potreros ?? []) as Potrero[]}
    />
  );
}
