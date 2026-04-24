import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Exportamos el cliente para usarlo en el Login y después en el Reproductor
export const supabase = createClient(supabaseUrl, supabaseKey);