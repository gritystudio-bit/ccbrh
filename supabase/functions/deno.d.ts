declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export { createClient } from '@supabase/supabase-js';
}
