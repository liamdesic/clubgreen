// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://xkqioergzocysebvrhcs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcWlvZXJnem9jeXNlYnZyaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNjQxMjIsImV4cCI6MjA1OTg0MDEyMn0.tuQrsNNLfrK8ym403MHjIUL2YCpYUhSpD0q1Yll04Ls'
);
