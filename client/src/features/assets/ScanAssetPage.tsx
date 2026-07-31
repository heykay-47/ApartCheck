import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AssetIdentityPlate } from './AssetIdentityPlate'
import { useScanAsset } from './asset-api'

export function ScanAssetPage() {
  const { qrToken = '' } = useParams()
  const scan = useScanAsset(qrToken)
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    if (!scan.data) return
    const reduce =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (reduce) {
      setRevealed(true)
      return
    }
    const timer = window.setTimeout(() => setRevealed(true), 250)
    return () => window.clearTimeout(timer)
  }, [scan.data])
  if (scan.isLoading)
    return (
      <section className="page">
        <p className="eyebrow">SCAN / RESOLVING</p>
        <h1>Scan asset</h1>
        <p className="asset-code">{qrToken}</p>
        <p>Resolving asset label...</p>
      </section>
    )
  if (scan.isError || !scan.data)
    return (
      <section className="message-page unavailable-state">
        <p className="eyebrow">SCAN / UNAVAILABLE</p>
        <p>
          This asset is unavailable. Check the label or ask the society admin.
        </p>
      </section>
    )
  return (
    <section className="page scan-page">
      <p className="eyebrow">SCAN / VERIFIED</p>
      <div
        data-testid="scan-result"
        data-revealed={revealed}
        className="scan-result"
      >
        <AssetIdentityPlate asset={scan.data} />
      </div>
    </section>
  )
}
