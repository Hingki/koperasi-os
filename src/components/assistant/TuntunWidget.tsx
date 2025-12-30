'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { submitQuery } from '@/lib/assistant/actions'

export default function TuntunWidget() {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')

  const handleQuery = async () => {
    if (!input) return
    const res = await submitQuery(input, 'retail')
    setResponse(res.response)
    setInput('')
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 p-4 shadow-xl border-t-4 border-green-600 hidden md:block">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm">TUNTUN – Operasional</h3>
      </div>
      <div className="space-y-2">
        {response && <p className="text-xs bg-muted p-2 rounded">{response}</p>}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya TUNTUN..."
            className="h-8 text-xs"
          />
          <Button onClick={handleQuery} size="sm" className="h-8 text-xs">
            Kirim
          </Button>
        </div>
      </div>
    </Card>
  )
}
