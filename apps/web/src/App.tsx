import { useState } from 'react'
import { Button } from './components/Button'
import type { ApiResponse } from '@healz/shared'

function App() {
  const [count, setCount] = useState(0)

  const response: ApiResponse<number> = {
    success: true,
    data: count,
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Healz Web App
        </h1>
        <p className="text-gray-600 mb-6">
          React + Vite + Tailwind CSS v4 + Radix UI
        </p>
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">
            Counter: {response.data}
          </p>
          <Button onClick={() => setCount((count) => count + 1)}>
            Increment Count
          </Button>
        </div>
        <p className="text-xs text-gray-400">
          Using @healz/shared package for type safety
        </p>
      </div>
    </div>
  )
}

export default App
