import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tovywchpygecsxtbapfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdnl3Y2hweWdlY3N4dGJhcGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNzE2MDgsImV4cCI6MjA4ODg0NzYwOH0.tNExNQ7UqeyRsuOdlUbdDKFGwKoJRZDYSu82bj_umDg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
