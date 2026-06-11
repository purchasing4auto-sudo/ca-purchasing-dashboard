import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with lazy initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient: any = null;
let isConfigured = false;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Real-time updates will not work.');
} else {
  isConfigured = true;
}

// Lazy initialization of Supabase client
function getSupabaseClient() {
  if (!supabaseClient) {
    if (!isConfigured) {
      // Return a dummy client that won't throw errors
      return {
        from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
        channel: () => ({ on: () => ({ subscribe: () => null }) }),
        removeChannel: () => {},
      };
    }
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return supabaseClient;
}

export const supabase = new Proxy({}, {
  get: (target, prop) => {
    const client = getSupabaseClient();
    return (client as any)[prop];
  },
});

export function isSupabaseConfigured() {
  return isConfigured;
}

// Subscribe to PR changes in real-time
export function subscribeToPRChanges(callback: (payload: any) => void) {
  if (!isConfigured) {
    console.warn('Supabase not configured, skipping subscription');
    return null;
  }

  const client = getSupabaseClient();
  const subscription = client
    .channel('pr_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'prs', // Adjust table name based on your Supabase schema
      },
      (payload: any) => {
        console.log('PR change detected:', payload);
        callback(payload);
      }
    )
    .subscribe();

  return subscription;
}

// Subscribe to search results changes
export function subscribeToSearchResults(callback: (payload: any) => void) {
  if (!isConfigured) {
    console.warn('Supabase not configured, skipping subscription');
    return null;
  }

  const client = getSupabaseClient();
  const subscription = client
    .channel('search_results_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'search_results', // Adjust table name based on your Supabase schema
      },
      (payload: any) => {
        console.log('Search result change detected:', payload);
        callback(payload);
      }
    )
    .subscribe();

  return subscription;
}

// Fetch all PRs
export async function fetchPRs() {
  if (!isConfigured) {
    return [];
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('prs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching PRs:', error);
    return [];
  }

  return data || [];
}

// Fetch all search results
export async function fetchSearchResults() {
  if (!isConfigured) {
    return [];
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('search_results')
    .select('*')
    .order('found_at', { ascending: false });

  if (error) {
    console.error('Error fetching search results:', error);
    return [];
  }

  return data || [];
}

// Fetch PR statistics
export async function fetchPRStats() {
  if (!isConfigured) {
    return { total: 0, timeout: 0, completed: 0 };
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('prs')
    .select('status');

  if (error) {
    console.error('Error fetching PR stats:', error);
    return { total: 0, timeout: 0, completed: 0 };
  }

  const stats = {
    total: data?.length || 0,
    timeout: data?.filter((p: any) => p.status === 'timeout').length || 0,
    completed: data?.filter((p: any) => p.status === 'completed').length || 0,
  };

  return stats;
}

// Unsubscribe from changes
export function unsubscribeFromChanges(subscription: any) {
  if (!subscription || !isConfigured) {
    return;
  }

  const client = getSupabaseClient();
  client.removeChannel(subscription);
}
