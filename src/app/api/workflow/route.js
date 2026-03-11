/**
 * GET  /api/workflow  — Get current tenant's workflow configuration
 * PUT  /api/workflow  — Update tenant's workflow configuration
 * POST /api/workflow  — Initialize workflow with a preset
 */
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { WORKFLOW_PRESETS, getWorkflowConfig } from '@/lib/workflow-config';

export async function GET(request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    // Get tenant profile with workflow config
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const tenantId = profile?.tenant_id;

    if (tenantId) {
      const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
      const workflowConfig = tenant?.workflow_config || getWorkflowConfig('midsize');
      return Response.json({ config: workflowConfig, presets: WORKFLOW_PRESETS, tenantId });
    }

    // No tenant — return default
    return Response.json({ config: getWorkflowConfig('midsize'), presets: WORKFLOW_PRESETS, tenantId: null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { presetId = 'midsize' } = body;

    const config = getWorkflowConfig(presetId);

    // Try to save to tenant
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile?.tenant_id) {
      await supabase.from('tenants').update({ workflow_config: config }).eq('id', profile.tenant_id);
    }

    return Response.json({ success: true, config });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { config } = body;
    if (!config) return Response.json({ error: 'Missing config' }, { status: 400 });

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile?.tenant_id) {
      await supabase.from('tenants').update({ workflow_config: config }).eq('id', profile.tenant_id);
    }

    return Response.json({ success: true, config });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
