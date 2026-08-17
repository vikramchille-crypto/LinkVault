// Supabase Edge Function: admin-users
//
// Powers a single admin account's ability to see a list of all users,
// delete a user's account, and download a full backup of every user's
// data. This deliberately uses the SERVICE ROLE key (auto-provided to every
// Edge Function by Supabase — never set manually, never exposed to the
// frontend) to bypass Row Level Security, which is normally exactly what
// keeps one user's data invisible to another. That bypass is safe here
// only because:
//   1. This code runs entirely server-side; the service role key never
//      leaves this function.
//   2. Every request is checked against ADMIN_EMAIL (a Supabase secret)
//      before doing anything — anyone else gets a 403, and their own data
//      remains exactly as private as before this function existed.
//
// Deploy with: supabase functions deploy admin-users
// Requires: supabase secrets set ADMIN_EMAIL=you@yourdomain.com

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const adminEmail = Deno.env.get('ADMIN_EMAIL')

  if (!adminEmail) {
    return jsonResponse({ error: 'ADMIN_EMAIL is not configured on the server.' }, 500)
  }

  try {
    // Identify the caller using their own JWT (already verified by the
    // platform gateway via verify_jwt=true) against the anon-key client —
    // this only tells us who they are, it does NOT bypass RLS.
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser()

    if (!caller || caller.email?.toLowerCase() !== adminEmail.toLowerCase()) {
      return jsonResponse({ error: 'Not authorized. This page is restricted to the admin account.' }, 403)
    }

    // Only past this point do we touch the service-role client.
    const admin = createClient(supabaseUrl, serviceRoleKey)
    const body = await req.json().catch(() => ({}))
    const { action, userId } = body as { action?: string; userId?: string }

    if (action === 'list') {
      const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1000 })
      if (usersError) throw usersError

      const { data: linkCounts, error: countError } = await admin
        .from('links')
        .select('user_id')
        .eq('is_deleted', false)
      if (countError) throw countError

      const counts = new Map<string, number>()
      for (const row of linkCounts ?? []) {
        counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1)
      }

      const users = usersData.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        link_count: counts.get(u.id) ?? 0,
      }))

      return jsonResponse({ users })
    }

    if (action === 'delete') {
      if (!userId) return jsonResponse({ error: 'Missing "userId".' }, 400)
      if (userId === caller.id) {
        return jsonResponse({ error: "You can't delete your own admin account from here." }, 400)
      }

      // Deleting the auth user cascades to their links/categories/sources
      // automatically (all have `on delete cascade` on the user_id foreign
      // key — see supabase/schema.sql), so nothing else needs cleaning up.
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
      if (deleteError) throw deleteError

      return jsonResponse({ success: true })
    }

    if (action === 'backup') {
      const [links, categories, sources] = await Promise.all([
        admin.from('links').select('*'),
        admin.from('categories').select('*'),
        admin.from('sources').select('*'),
      ])
      if (links.error) throw links.error
      if (categories.error) throw categories.error
      if (sources.error) throw sources.error

      return jsonResponse({
        exported_at: new Date().toISOString(),
        links: links.data,
        categories: categories.data,
        sources: sources.data,
      })
    }

    return jsonResponse({ error: `Unknown action "${action}".` }, 400)
  } catch (err) {
    console.error('admin-users error:', err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Admin request failed.' }, 500)
  }
})
