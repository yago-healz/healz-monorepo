import { useEffect, useState } from 'react'

interface ViaCepAddress {
  street: string
  neighborhood: string
  city: string
  state: string
}

interface ViaCepResponse {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export interface UseCepLookupReturn {
  isLoading: boolean
  address: ViaCepAddress | null
  error: string | null
}

export function useCepLookup(rawCep: string): UseCepLookupReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [address, setAddress] = useState<ViaCepAddress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const digits = rawCep.replace(/\D/g, '')

  useEffect(() => {
    if (digits.length !== 8) {
      setAddress(null)
      setError(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      setError(null)
      setAddress(null)

      try {
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
        const data: ViaCepResponse = await response.json()

        if (data.erro) {
          setError('CEP não encontrado')
        } else {
          setAddress({
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          })
        }
      } catch {
        setError('Erro ao consultar o CEP')
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [digits])

  return { isLoading, address, error }
}
