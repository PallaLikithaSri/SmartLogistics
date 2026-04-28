// ============================================================================
// ORIGINAL SUPABASE CLIENT (COMMENTED OUT FOR DEMO MODE)
// ============================================================================
// Uncomment the code below to use real Supabase backend
// import { createClient } from '@supabase/supabase-js';
// /// <reference types="vite/client" />
//
// const url = import.meta.env.VITE_SUPABASE_URL;
// const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
//
// if (!url || !anonKey) {
//   throw new Error('Missing Supabase environment variables. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local');
// }
//
// export const supabase = createClient(url, anonKey);

// ============================================================================
// DEMO BACKEND CLIENT FOR CLIENT DEMONSTRATIONS
// ============================================================================
// This demo backend provides in-memory storage and mock data
// No actual backend connectivity is required
import { supabase } from './demoBackend';

console.log('🎯 DEMO MODE ENABLED - Using in-memory backend for demonstrations');

export { supabase };
