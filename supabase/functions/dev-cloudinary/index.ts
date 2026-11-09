import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEVELOPER_EMAILS = ["dev.goodyhut@gmail.com", "shahriarnabil94@gmail.com"];

function cloudinaryAuth() {
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY')!;
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET')!;
  return 'Basic ' + btoa(`${apiKey}:${apiSecret}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !DEVELOPER_EMAILS.includes(user.email || "")) {
      return new Response(JSON.stringify({ error: 'Access denied — developer only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Cloudinary credentials not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, folder, public_ids } = await req.json();
    const baseUrl = `https://api.cloudinary.com/v1_1/${cloudName}`;

    if (action === 'browse') {
      // Get subfolders
      let foldersData: any[] = [];
      try {
        const foldersUrl = folder
          ? `${baseUrl}/folders/${folder}`
          : `${baseUrl}/folders`;
        const fRes = await fetch(foldersUrl, {
          headers: { Authorization: cloudinaryAuth() },
        });
        const fData = await fRes.json();
        foldersData = (fData.folders || []).map((f: any) => ({
          name: f.name,
          path: f.path,
        }));
      } catch (e) {
        console.log('Folders fetch error:', e);
      }

      // Get resources in folder
      let resourcesData: any[] = [];
      try {
        const prefix = folder ? `${folder}/` : '';
        const rUrl = `${baseUrl}/resources/image?type=upload&prefix=${encodeURIComponent(prefix)}&max_results=100`;
        const rRes = await fetch(rUrl, {
          headers: { Authorization: cloudinaryAuth() },
        });
        const rData = await rRes.json();
        
        // Filter to only direct children (not nested)
        resourcesData = (rData.resources || [])
          .filter((r: any) => {
            if (!folder) return !r.public_id.includes('/');
            const rest = r.public_id.slice(folder.length + 1);
            return rest && !rest.includes('/');
          })
          .map((r: any) => ({
            public_id: r.public_id,
            secure_url: r.secure_url,
            format: r.format,
            bytes: r.bytes,
            width: r.width,
            height: r.height,
            created_at: r.created_at,
          }));
      } catch (e) {
        console.log('Resources fetch error:', e);
      }

      return new Response(JSON.stringify({ folders: foldersData, resources: resourcesData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      if (!public_ids || !Array.isArray(public_ids) || public_ids.length === 0) {
        return new Response(JSON.stringify({ error: 'No public_ids provided' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete up to 100 at a time
      const deleteUrl = `${baseUrl}/resources/image/upload`;
      const res = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          Authorization: cloudinaryAuth(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ public_ids: public_ids.slice(0, 100) }),
      });

      const result = await res.json();

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cloudinary manager error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
