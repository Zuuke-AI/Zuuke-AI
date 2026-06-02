'use client'

import { useRouter } from 'next/navigation'

interface RemixButtonProps {
  buildTitle: string
  buildBudget: string | null
  buildUseCase: string | null
}

export default function RemixButton({ buildTitle, buildBudget, buildUseCase }: RemixButtonProps) {
  const router = useRouter()

  function handleRemix() {
    const budgetHint = buildBudget ? ` with a budget of ${buildBudget}` : ''
    const useCaseHint = buildUseCase ? ` for ${buildUseCase}` : ''
    const prompt = `I found this build: "${buildTitle}"${budgetHint}${useCaseHint}. Can you remix it for me? `
    router.push(`/chat?prompt=${encodeURIComponent(prompt)}`)
  }

  return (
    <button className="build-remix-btn" onClick={handleRemix}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="1 4 1 10 7 10" />
        <polyline points="23 20 23 14 17 14" />
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
      </svg>
      Remix This Build
    </button>
  )
}
