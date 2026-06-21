type Props = {
  businessName: string
  tagline: string
  region: string
  city: string
  description: string
  onBusinessNameChange: (v: string) => void
  onTaglineChange: (v: string) => void
  onRegionChange: (v: string) => void
  onCityChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  error?: string | null
}

export function BusinessBasicsForm({
  businessName,
  tagline,
  region,
  city,
  description,
  onBusinessNameChange,
  onTaglineChange,
  onRegionChange,
  onCityChange,
  onDescriptionChange,
  error,
}: Props) {
  return (
    <div className="prov-onboard__section">
      <div className="prov-onboard__head">
        <h1 className="prov-onboard__title">Your business</h1>
        <p className="prov-onboard__sub">A few details for your public profile.</p>
      </div>

      {error ? <p className="prov-onboard__error">{error}</p> : null}

      <div className="prov-onboard__form">
        <label className="prov-onboard__field">
          <span>Business name</span>
          <input
            type="text"
            className="prov-onboard__input"
            value={businessName}
            onChange={(e) => onBusinessNameChange(e.target.value)}
            placeholder="e.g. Desert Stays Namibia"
            required
          />
        </label>

        <label className="prov-onboard__field">
          <span>Tagline</span>
          <input
            type="text"
            className="prov-onboard__input"
            value={tagline}
            onChange={(e) => onTaglineChange(e.target.value)}
            placeholder="Short description of what you offer"
          />
        </label>

        <div className="prov-onboard__field-row">
          <label className="prov-onboard__field">
            <span>City</span>
            <input
              type="text"
              className="prov-onboard__input"
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              placeholder="Windhoek"
            />
          </label>
          <label className="prov-onboard__field">
            <span>Region</span>
            <input
              type="text"
              className="prov-onboard__input"
              value={region}
              onChange={(e) => onRegionChange(e.target.value)}
              placeholder="Khomas"
            />
          </label>
        </div>

        <label className="prov-onboard__field">
          <span>About your business</span>
          <textarea
            className="prov-onboard__textarea"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="What makes your services special?"
            rows={4}
          />
        </label>
      </div>
    </div>
  )
}
