import { useEffect, useState } from 'react'
import { fetchAssetQr, assetCategories, type Asset } from './asset-api'
import './asset-print.css'

export function AssetIdentityPlate({
  asset,
  qrUrl: suppliedQrUrl,
  allowQr = false,
  onQrReady,
}: {
  asset: Asset
  qrUrl?: string
  allowQr?: boolean
  onQrReady?: (url: string) => void
}) {
  const [qrUrl, setQrUrl] = useState(suppliedQrUrl)
  useEffect(() => {
    if (suppliedQrUrl || !allowQr) return
    let current: string | undefined
    void fetchAssetQr(asset.id)
      .then((url) => {
        current = url
        setQrUrl(url)
        onQrReady?.(url)
      })
      .catch(() => undefined)
    return () => {
      if (current) URL.revokeObjectURL(current)
    }
  }, [allowQr, asset.id, suppliedQrUrl])
  const category =
    assetCategories.find((item) => item.value === asset.category)?.label ??
    asset.category
  return (
    <article className="identity-plate" data-asset-code={asset.assetCode}>
      <div className="plate-copy">
        <p className="eyebrow">ASSET IDENTITY / {category}</p>
        <p className="asset-code">{asset.assetCode}</p>
        <h2>{asset.name}</h2>
        <dl>
          <div>
            <dt>Location</dt>
            <dd>{asset.locationDescription}</dd>
          </div>
          <div>
            <dt>Install date</dt>
            <dd>
              {asset.installDate
                ? new Date(asset.installDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Not recorded'}
            </dd>
          </div>
          <div>
            <dt>State</dt>
            <dd>{asset.archivedAt ? 'Archived' : 'Active'}</dd>
          </div>
        </dl>
      </div>
      <div className="plate-qr">
        {qrUrl ? (
          <>
            <img src={qrUrl} alt={`QR code for ${asset.assetCode}`} />
            {allowQr ? (
              <a href={qrUrl} download={`${asset.assetCode}.svg`}>
                Download QR
              </a>
            ) : null}
          </>
        ) : (
          <span aria-label="QR code loading">QR loading</span>
        )}
      </div>
    </article>
  )
}
