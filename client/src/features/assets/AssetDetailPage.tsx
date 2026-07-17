import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCurrentUser } from '../auth/auth-api'
import { AssetForm } from './AssetForm'
import { AssetIdentityPlate } from './AssetIdentityPlate'
import { useArchiveAsset, useAsset } from './asset-api'

export function AssetDetailPage() {
  const { id = '' } = useParams()
  const { data: user } = useCurrentUser()
  const asset = useAsset(id)
  const archive = useArchiveAsset()
  const [editing, setEditing] = useState(false)
  if (asset.isLoading)
    return (
      <main className="page">
        <p>Loading asset...</p>
      </main>
    )
  if (!asset.data)
    return (
      <main className="message-page">
        <p className="eyebrow">RECORD / UNAVAILABLE</p>
        <p>
          This asset is unavailable. Check the label or ask the society admin.
        </p>
      </main>
    )
  return (
    <main className="page asset-detail">
      <p className="eyebrow">ASSET DETAIL / {asset.data.assetCode}</p>
      <AssetIdentityPlate asset={asset.data} allowQr={user?.role === 'admin'} />
      <div className="asset-actions">
        <Link className="text-button" to="/assets">
          Back to ledger
        </Link>
        {user?.role === 'admin' ? (
          <>
            <button
              className="text-button"
              onClick={() => setEditing(!editing)}
            >
              {editing ? 'Cancel edit' : 'Edit asset'}
            </button>
            <button
              className="text-button destructive"
              onClick={() => archive.mutate(asset.data!.id)}
            >
              Archive asset
            </button>
            <button className="text-button" onClick={() => window.print()}>
              Print asset label
            </button>
          </>
        ) : null}
      </div>
      {editing ? (
        <AssetForm asset={asset.data} onSaved={() => setEditing(false)} />
      ) : null}
    </main>
  )
}
