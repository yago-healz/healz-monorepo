import { useState } from 'react'
import { Plus, Minus, Trash2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TimeBlock } from '@/types/onboarding'

export function SchedulingTab() {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([
    { id: '1', from: '12:00', to: '14:00' },
  ])
  const [minimumInterval, setMinimumInterval] = useState(15)

  const addTimeBlock = () => {
    setTimeBlocks([...timeBlocks, { id: Date.now().toString(), from: '09:00', to: '10:00' }])
  }

  const removeTimeBlock = (id: string) => {
    setTimeBlocks(timeBlocks.filter(block => block.id !== id))
  }

  const updateTimeBlock = (id: string, field: 'from' | 'to', value: string) => {
    setTimeBlocks(timeBlocks.map(block =>
      block.id === id ? { ...block, [field]: value } : block
    ))
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-5 h-5 text-pink-500" />
          <h2 className="text-lg font-semibold text-foreground">
            Schedule Rules
          </h2>
        </div>

        <div className="bg-white rounded-xl border border-border p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Blocked Times */}
            <div>
              <h3 className="font-semibold text-foreground mb-1">Blocked Times</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Times when Carol should never book appointments (e.g., Lunch, Admin work).
              </p>

              {timeBlocks.map((block) => (
                <div key={block.id} className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={block.from}
                      onChange={(e) => updateTimeBlock(block.id, 'from', e.target.value)}
                      className="w-24"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input
                      type="time"
                      value={block.to}
                      onChange={(e) => updateTimeBlock(block.id, 'to', e.target.value)}
                      className="w-24"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTimeBlock(block.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <button
                onClick={addTimeBlock}
                className="flex items-center gap-1 text-pink-500 text-sm hover:text-pink-600 transition-colors mt-2"
              >
                <Plus className="w-4 h-4" />
                Add time block
              </button>
            </div>

            {/* Minimum Intervals */}
            <div>
              <h3 className="font-semibold text-foreground mb-1">Minimum Intervals</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Buffer time Carol should keep between different patient visits.
              </p>

              <div className="flex items-center justify-center gap-4 py-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMinimumInterval(Math.max(0, minimumInterval - 5))}
                  className="rounded-full"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="text-center">
                  <span className="text-4xl font-bold text-pink-500">{minimumInterval}</span>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                    Minutes
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMinimumInterval(minimumInterval + 5)}
                  className="rounded-full"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Button
        onClick={() => console.log('save', { timeBlocks, minimumInterval })}
        className="bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white px-8"
      >
        Salvar
      </Button>
    </div>
  )
}
