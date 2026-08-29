import React, { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Globe2,
  HelpCircle,
  Info,
  MapPin,
  Search,
  Sparkles,
} from 'lucide-react'
import { createBusiness } from '../../api/businessClient'
import {
  BUSINESS_CATEGORIES,
  getCategoryIcon,
  type BusinessCategoryDefinition,
} from '../../constants/businessCategories'
import type { BusinessMembershipDto } from '@delve/contracts'

const POPULAR_COUNTRIES = [
  { code: 'NA', name: 'Namibia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'BW', name: 'Botswana' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZW', name: 'Zimbabwe' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'UG', name: 'Uganda' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'MZ', name: 'Mozambique' },
]

interface CreateBusinessPageProps {
  onBack?: () => void
  onSuccess?: (membership: BusinessMembershipDto) => void
}

export default function CreateBusinessPage({
  onBack,
  onSuccess,
}: CreateBusinessPageProps) {
  const [name, setName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [description, setDescription] = useState('')
  const [countryCode, setCountryCode] = useState('NA')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')

  const [categorySearch, setCategorySearch] = useState('')
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) {
      return showAllCategories
        ? BUSINESS_CATEGORIES
        : BUSINESS_CATEGORIES.slice(0, 8)
    }
    const q = categorySearch.toLowerCase().trim()
    return BUSINESS_CATEGORIES.filter(
      c =>
        c.label.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    )
  }, [categorySearch, showAllCategories])

  const isValid = name.trim().length >= 2 && selectedCategory.trim().length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || loading) return

    setLoading(true)
    setError(null)

    try {
      const result = await createBusiness({
        name: name.trim(),
        category: selectedCategory,
        description: description.trim() || undefined,
        countryCode: countryCode.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
      })

      if (onSuccess) {
        onSuccess(result)
      } else {
        // Fallback default navigation to provider business view
        window.location.href = '/provider/business'
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pb-16 pt-4 sm:pt-8" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Navigation & Header */}
        <div className="mb-6 flex items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : (
            <a
              href="/provider"
              className="inline-flex items-center gap-2 text-sm font-semibold no-underline transition-opacity hover:opacity-80"
              style={{ color: 'var(--primary)' }}
            >
              <ArrowLeft size={16} />
              Provider Hub
            </a>
          )}

          <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--primary)' }}>Step 1 of 2</span>
            <span style={{ color: 'var(--fg-muted)' }}>· Business Basics</span>
          </div>
        </div>

        {/* Hero title */}
        <div className="mb-8 text-center sm:text-left">
          <div
            className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, rgba(140,82,255,0.15), rgba(42,107,90,0.15))', border: '1px solid var(--border)' }}
          >
            <Building2 size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <h1 className="font-display text-2xl font-black sm:text-3xl" style={{ color: 'var(--fg)' }}>
            Create your business profile
          </h1>
          <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--fg-muted)' }}>
            Set up your legal entity and primary public profile on Delve. You will be able to add distinct business areas (e.g. restaurant, tours, transport) right after.
          </p>
        </div>

        {error && (
          <div
            className="mb-6 rounded-2xl p-4 text-sm font-medium"
            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Main Onboarding Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Card 1: Core Name & Category */}
          <div
            className="rounded-3xl p-6 sm:p-8"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
            }}
          >
            <h2 className="text-base font-bold sm:text-lg" style={{ color: 'var(--fg)' }}>
              1. Business Identity & Primary Category
            </h2>
            <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--fg-muted)' }}>
              Enter the official name of your business and choose your primary area of service.
            </p>

            <div className="mt-6 space-y-6">
              {/* Business Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                  Business Name <span style={{ color: 'var(--primary)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Desert Star Lodge & Safaris"
                  className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-medium transition-all focus:outline-none"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                  }}
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                  This is your official business name displayed on traveler invoices and public pages.
                </p>
              </div>

              {/* Category Picker */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                    Primary Category <span style={{ color: 'var(--primary)' }}>*</span>
                  </label>
                  {selectedCategory && (
                    <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
                      Selected: {selectedCategory}
                    </span>
                  )}
                </div>

                {/* Category Search bar for extensible taxonomy */}
                <div className="relative mt-2">
                  <Search size={16} className="absolute left-3.5 top-3.5" style={{ color: 'var(--fg-muted)' }} />
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={e => setCategorySearch(e.target.value)}
                    placeholder="Search or filter categories (e.g., Accommodation, Tours, Food)..."
                    className="w-full rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm focus:outline-none"
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--fg)',
                    }}
                  />
                </div>

                {/* Visual Grid of Category Cards */}
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {filteredCategories.map(cat => {
                    const IconComponent = getCategoryIcon(cat.iconName)
                    const isSelected = selectedCategory === cat.id

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className="flex items-start gap-3.5 rounded-2xl p-3.5 text-left transition-all"
                        style={{
                          background: isSelected
                            ? 'linear-gradient(135deg, rgba(140,82,255,0.08), rgba(42,107,90,0.08))'
                            : 'var(--bg)',
                          border: isSelected
                            ? '2px solid var(--primary)'
                            : '1px solid var(--border)',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors"
                          style={{
                            background: isSelected ? 'var(--primary)' : 'var(--surface-subtle)',
                            color: isSelected ? '#FFFFFF' : 'var(--fg)',
                          }}
                        >
                          <IconComponent size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="m-0 text-sm font-bold truncate" style={{ color: isSelected ? 'var(--primary)' : 'var(--fg)' }}>
                              {cat.label}
                            </p>
                            {isSelected && <CheckCircle2 size={16} style={{ color: 'var(--primary)' }} />}
                          </div>
                          <p className="m-0 mt-0.5 text-xs line-clamp-2" style={{ color: 'var(--fg-muted)' }}>
                            {cat.description}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {!categorySearch && !showAllCategories && BUSINESS_CATEGORIES.length > 8 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories(true)}
                    className="mt-3 block w-full rounded-xl py-2 text-center text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: 'var(--primary)', border: '1px dashed var(--border)', background: 'transparent', cursor: 'pointer' }}
                  >
                    Show all {BUSINESS_CATEGORIES.length} categories ↓
                  </button>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                  Business Description <span style={{ color: 'var(--fg-muted)', fontWeight: 'normal' }}>(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Introduce your business, experiences offered, story, and what makes your service unique..."
                  className="mt-2 w-full rounded-xl p-3.5 text-sm transition-all focus:outline-none"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Location & Contact */}
          <div
            className="rounded-3xl p-6 sm:p-8"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center gap-2">
              <MapPin size={20} style={{ color: 'var(--primary)' }} />
              <h2 className="text-base font-bold sm:text-lg" style={{ color: 'var(--fg)' }}>
                2. Location & Contact Details
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--fg-muted)' }}>
              Help travelers discover you by country, town, or regional destination.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Country */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                  Country
                </label>
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  className="mt-2 w-full rounded-xl px-3.5 py-3 text-sm focus:outline-none"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                  }}
                >
                  {POPULAR_COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                  City / Region
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Swakopmund or Sossusvlei"
                  className="mt-2 w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                  }}
                />
              </div>

              {/* Street Address */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                  Physical Address / Base Location <span style={{ color: 'var(--fg-muted)', fontWeight: 'normal' }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. 14 Sam Nujoma Avenue, Swakopmund"
                  className="mt-2 w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                  }}
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                  Website <span style={{ color: 'var(--fg-muted)', fontWeight: 'normal' }}>(Optional)</span>
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="mt-2 w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                  }}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                  Business Contact Email <span style={{ color: 'var(--fg-muted)', fontWeight: 'normal' }}>(Optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="info@example.com"
                  className="mt-2 w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Call to action & Multi-profile notice */}
          <div
            className="flex items-start gap-3.5 rounded-2xl p-4.5 text-xs sm:text-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(140,82,255,0.06), rgba(42,107,90,0.06))',
              border: '1px solid var(--border)',
              color: 'var(--fg-muted)',
            }}
          >
            <Sparkles size={20} className="shrink-0" style={{ color: 'var(--primary)' }} />
            <div>
              <p className="m-0 font-bold" style={{ color: 'var(--fg)' }}>
                Operating multiple business verticals?
              </p>
              <p className="m-0 mt-0.5 leading-relaxed">
                You can create separate public business areas (e.g. your restaurant, spa, airport transfers, or safari experiences) right after completing your main business creation.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            ) : <span />}

            <button
              type="submit"
              disabled={!isValid || loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-all"
              style={{
                background: 'var(--primary)',
                border: 'none',
                opacity: !isValid || loading ? 0.6 : 1,
                cursor: !isValid || loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                'Creating Business...'
              ) : (
                <>
                  <span>Create Business & Continue</span>
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
