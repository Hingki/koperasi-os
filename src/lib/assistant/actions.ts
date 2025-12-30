'use server'

import { createClient } from '@/lib/supabase/server'
import { LogService } from '@/lib/services/log-service'
import { AssistantContext } from './core'

export async function submitQuery(query: string, context: AssistantContext) {
  const supabase = await createClient()
  const logService = new LogService(supabase)

  await logService.log({
    action_type: 'SYSTEM',
    action_detail: 'Assistant Query',
    status: 'SUCCESS',
    metadata: { query, context }
  })

  return {
    response: "Maaf, fitur asisten AI saat ini sedang dinonaktifkan selama fase Pilot Governance Lock."
  }
}
