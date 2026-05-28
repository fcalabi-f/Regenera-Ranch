'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { ParsedPaddock } from '@regenera/shared';

export async function signOutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function createCampoAction(
  formData: FormData,
): Promise<{ id?: string; error?: string }> {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'El nombre es obligatorio.' };
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sin sesión.' };

  const { data, error } = await supabase
    .from('campos')
    .insert({ name, owner_user_id: user.id })
    .select('id')
    .single();
  if (error) return { error: error.message };
  revalidatePath('/');
  return { id: data.id };
}

export async function bulkInsertPotrerosAction(
  campoId: string,
  paddocks: ParsedPaddock[],
): Promise<{ inserted: number; error?: string }> {
  const supabase = await getSupabaseServerClient();
  const rows = paddocks.map((p) => ({
    campo_id: campoId,
    name: p.name,
    geometry: p.geometry,
    area_ha: p.area_ha,
  }));
  const { error, data } = await supabase.from('potreros').insert(rows).select('id');
  if (error) return { inserted: 0, error: error.message };
  revalidatePath('/');
  return { inserted: data?.length ?? 0 };
}

export async function deletePotreroAction(
  id: string,
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServerClient();
  // RLS garantiza que solo borra si el potrero pertenece a un campo del usuario.
  const { error } = await supabase.from('potreros').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/');
  return { ok: true };
}

export async function deleteAllPotrerosAction(
  campoId: string,
): Promise<{ deleted: number; error?: string }> {
  const supabase = await getSupabaseServerClient();
  const { error, count } = await supabase
    .from('potreros')
    .delete({ count: 'exact' })
    .eq('campo_id', campoId);
  if (error) return { deleted: 0, error: error.message };
  revalidatePath('/');
  return { deleted: count ?? 0 };
}
