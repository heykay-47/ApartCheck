import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../auth/auth-api'
import { assetCategories, useAssets, type AssetCategory } from './asset-api'

export function AssetsPage() {
  const { data: user } = useCurrentUser()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<AssetCategory | ''>('')
  const assets = useAssets({
    page: 1,
    pageSize: 25,
    search: useDeferredValue(search),
    category,
  })
  return (
    <section className="page assets-page">
      <p className="eyebrow">03 / PHYSICAL RECORD</p>
      <h1>Every asset has an address.</h1>
      <p className="lede">
        Search service equipment by code, name, location, or category.
      </p>
      <div className="asset-toolbar">
        <label className="search-field">
          Search assets
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Code, name, or location"
          />
        </label>
        <label className="search-field">
          Category
          <select
            aria-label="Category filter"
            value={category}
            onChange={(e) => setCategory(e.target.value as AssetCategory | '')}
          >
            <option value="">All categories</option>
            {assetCategories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        {user?.role === 'admin' ? (
          <Link className="primary-button" to="/admin/assets">
            Create asset
          </Link>
        ) : null}
      </div>
      <div className="asset-ledger">
        <div className="asset-row asset-header">
          <span>Asset code</span>
          <span>Asset name</span>
          <span>Location</span>
          <span>Category</span>
          <span>State</span>
        </div>
        {assets.isLoading ? (
          <p>Loading assets...</p>
        ) : assets.data?.assets.length ? (
          assets.data.assets.map((asset) => (
            <Link
              className="asset-row"
              to={`/assets/${asset.id}`}
              key={asset.id}
            >
              <span data-label="Asset code">{asset.assetCode}</span>
              <strong data-label="Asset name">{asset.name}</strong>
              <span data-label="Location">{asset.locationDescription}</span>
              <span data-label="Category">
                {
                  assetCategories.find((item) => item.value === asset.category)
                    ?.label
                }
              </span>
              <span data-label="State">Active</span>
            </Link>
          ))
        ) : (
          <p className="empty-state">No assets match current ledger filters.</p>
        )}
      </div>
    </section>
  )
}
