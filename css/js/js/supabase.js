// /js/supabase.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


// Your project credentials (from your message)
const SUPABASE_URL = "https://ilknjefshcbulaelswdm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsa25qZWZzaGNidWxhZWxzd2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTg4MjgsImV4cCI6MjA3NDk5NDgyOH0.x9EBUUBA2svB2-qtkN7CbPQrmFXK46QFm-tfr1_o_9k";


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


export async function signIn(email){
const redirectTo = window.location.href; // must match a Redirect URL in Supabase auth settings
const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
if(error) throw error;
}


export async function signOut(){
const { error } = await supabase.auth.signOut();
if(error) throw error;
}


export function onAuthChange(cb){
supabase.auth.onAuthStateChange((_event, session) => cb(session?.user || null));
}


export async function getUser(){
const { data } = await supabase.auth.getUser();
return data.user || null;
}


export async function ensureProfile(){
const user = await getUser();
if(!user) return;
await supabase.from('profiles').upsert({ id: user.id, display_name: user.email });
}
