import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { apiFetch } from '../../../../api/client'
import { useDebouncedEffect } from '../../../../hooks/useDebouncedEffect'
import { useMediaQuery } from '../../../../hooks/useMediaQuery'
import { friendlyApiMessage } from '../../../../utils/friendlyError'
import {
  FOOD_VENUE_MODULES,
  moduleStatus,
  publishPayload,
  saveLabel,
  unpublishPayload,
  workspaceCompleteness,
  type FoodVenueModuleId,
  type ProviderFoodVenueRecord,
} from '../foodVenueModules'
import {
  buildFoodVenueModuleSaveBody,
  foodVenueModuleAutoSaveKey,
} from '../foodVenueModuleSave'
import { FoodVenuePhotoEditor } from '../FoodVenuePhotoEditor'
import { FoodVenueStoriesEditor } from '../FoodVenueStoriesEditor'
import type { FoodVenueFormValues, ProviderFoodVenue } from '../foodVenueTypes'
import { venueToForm } from '../foodVenueTypes'
import { scheduleFromJson } from '../openingHoursUtils'
import type { OpeningHoursSchedule } from '../openingHoursUtils'
import {
  FoodVenueContactModule,
  FoodVenueIdentityModule,
  FoodVenueLocationModule,
  FoodVenueServiceModule,
} from './FoodVenueModuleEditors'
import { FoodVenueModuleHub } from './FoodVenueModuleHub'
import { FoodVenueModuleNav } from './FoodVenueModuleNav'
import { FoodVenuePublishBar } from './FoodVenuePublishBar'
import { OpeningHoursEditor } from './OpeningHoursEditor'
import '../../ui/provider-ui.css'
import './food-venue-workspace.css'

type Props = {
  venue: ProviderFoodVenue
  canManage: boolean
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function FoodVenueWorkspace({ venue, canManage }: Props) {
  const qc = useQueryClient()
  const record = venue as ProviderFoodVenueRecord
  const isMobile = useMediaQuery('(max-width: 800px)')
  const [mobilePane, setMobilePane] = useState<'hub' | 'editor'>('hub')
  const [activeModule, setActiveModule] = useState<FoodVenueModuleId>('identity')
  const [form, setForm] = useState<FoodVenueFormValues>(() => venueToForm(venue))
  const [hours, setHours] = useState<OpeningHoursSchedule>(() =>
    scheduleFromJson(venue.opening_hours_json),
  )
  const [error, setError] = useState('')
  const [savedFlash, setSavedFlash] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const savedBaselineKey = useRef<string | null>(null)
  const skipAutoSave = useRef(true)
  const formRef = useRef(form)
  const hoursRef = useRef(hours)
  formRef.current = form
  hoursRef.current = hours

  useEffect(() => {
    const nextForm = venueToForm(venue)
    const nextHours = scheduleFromJson(venue.opening_hours_json)
    setForm(nextForm)
    setHours(nextHours)
    skipAutoSave.current = true
    savedBaselineKey.current = foodVenueModuleAutoSaveKey(
      activeModule,
      nextForm,
      nextHours,
    )
  }, [venue, activeModule])

  useEffect(() => {
    skipAutoSave.current = true
    savedBaselineKey.current = foodVenueModuleAutoSaveKey(
      activeModule,
      formRef.current,
      hoursRef.current,
    )
  }, [activeModule])

  const completeness = useMemo(() => workspaceCompleteness(record), [record, venue])

  const saveMut = useMutation({
    mutationFn: async (payload: {
      body: FormData | string
      module: FoodVenueModuleId
      silent?: boolean
    }) => {
      return apiFetch<ProviderFoodVenue>(`/api/food/provider-venues/${venue.id}/`, {
        method: 'PATCH',
        body: payload.body,
      })
    },
    onMutate: () => setSaveState('saving'),
    onSuccess: async (_data, variables) => {
      setError('')
      setSaveState('saved')
      savedBaselineKey.current = foodVenueModuleAutoSaveKey(
        variables.module,
        form,
        hours,
      )
      if (!variables.silent) {
        const mod = FOOD_VENUE_MODULES.find((m) => m.id === variables.module)
        setSavedFlash(`${mod?.label ?? 'Section'} saved`)
        window.setTimeout(() => setSavedFlash(''), 2500)
      }
      window.setTimeout(() => setSaveState('idle'), 2000)
      await qc.invalidateQueries({ queryKey: ['provider-food-venues'] })
      await qc.invalidateQueries({ queryKey: ['provider-food-venue', venue.id] })
      await qc.invalidateQueries({ queryKey: ['food'] })
    },
    onError: (err) => {
      setSaveState('error')
      setError(friendlyApiMessage(err, 'Could not save this section.'))
    },
  })

  const publishMut = useMutation({
    mutationFn: async (active: boolean) => {
      return apiFetch<ProviderFoodVenue>(`/api/food/provider-venues/${venue.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(active ? publishPayload() : unpublishPayload()),
      })
    },
    onSuccess: async () => {
      setError('')
      await qc.invalidateQueries({ queryKey: ['provider-food-venues'] })
      await qc.invalidateQueries({ queryKey: ['provider-food-venue', venue.id] })
      await qc.invalidateQueries({ queryKey: ['food'] })
    },
    onError: (err) => setError(friendlyApiMessage(err, 'Could not update publishing status.')),
  })

  const runSave = useCallback(
    (module: FoodVenueModuleId, silent = false) => {
      const built = buildFoodVenueModuleSaveBody(module, form, hours)
      if (!built.ok) {
        if (!silent) setError(built.error)
        return
      }
      setError('')
      saveMut.mutate({ body: built.body, module, silent })
    },
    [form, hours, saveMut],
  )

  function patchForm(partial: Partial<FoodVenueFormValues>) {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  function handleSave() {
    runSave(activeModule, false)
  }

  function selectModule(id: FoodVenueModuleId) {
    setActiveModule(id)
    if (isMobile) setMobilePane('editor')
  }

  const autoSaveKey = foodVenueModuleAutoSaveKey(activeModule, form, hours)

  useDebouncedEffect(
    () => {
      if (!canManage || skipAutoSave.current) {
        skipAutoSave.current = false
        return
      }
      if (saveMut.isPending) return
      if (!autoSaveKey || autoSaveKey === savedBaselineKey.current) return
      runSave(activeModule, true)
    },
    [autoSaveKey, activeModule, canManage, runSave, saveMut.isPending],
    1500,
    true,
  )

  const activeDef = FOOD_VENUE_MODULES.find((m) => m.id === activeModule)!
  const ActiveModuleIcon = activeDef.Icon
  const showHub = !isMobile || mobilePane === 'hub'
  const showEditor = !isMobile || mobilePane === 'editor'

  const saveStatusLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'saved'
        ? 'All changes saved'
        : saveState === 'error'
          ? 'Save failed'
          : null

  return (
    <div className="fv-workspace">
      <header className="fv-workspace__header">
        <div className="fv-workspace__title-row">
          <div>
            <p className="fv-workspace__eyebrow">Food venue</p>
            <h1>{venue.name || 'Untitled venue'}</h1>
          </div>
          <div className="fv-workspace__badges">
            <span className={`prov-ui__pill${venue.is_active ? ' prov-ui__pill--ok' : ' prov-ui__pill--warn'}`}>
              {venue.is_active ? 'Published' : 'Draft'}
            </span>
            <span className="prov-ui__pill prov-ui__pill--muted">{completeness.percent}% complete</span>
          </div>
        </div>
        <p className="fv-workspace__sub">
          Each section saves on its own — work in any order. {completeness.completeCount} of{' '}
          {FOOD_VENUE_MODULES.length} sections complete.
        </p>
        <div className="fv-workspace__links">
          <Link to="/provider/food" className="fv-workspace__back">
            <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
            All venues
          </Link>
          <Link to={`/food/${venue.id}`} className="fv-workspace__preview">
            Preview public page
          </Link>
        </div>
      </header>

      <FoodVenuePublishBar
        venue={record}
        canManage={canManage}
        isPending={publishMut.isPending}
        onPublish={() => publishMut.mutate(true)}
        onUnpublish={() => publishMut.mutate(false)}
        onJumpToModule={selectModule}
      />

      <div className="fv-workspace__layout">
        {showHub ? (
          isMobile ? (
            <FoodVenueModuleHub
              modules={FOOD_VENUE_MODULES}
              statusFor={(id) => moduleStatus(record, id)}
              onSelect={selectModule}
            />
          ) : (
            <FoodVenueModuleNav
              modules={FOOD_VENUE_MODULES}
              active={activeModule}
              statusFor={(id) => moduleStatus(record, id)}
              onSelect={selectModule}
            />
          )
        ) : null}

        {showEditor ? (
          <section className="fv-workspace__panel" aria-labelledby="fv-module-title">
            {isMobile ? (
              <button
                type="button"
                className="fv-workspace__mobile-back"
                onClick={() => setMobilePane('hub')}
              >
                <ChevronLeft size={18} strokeWidth={2.25} aria-hidden />
                All sections
              </button>
            ) : null}

            <header className="fv-workspace__panel-head">
              <h2 id="fv-module-title">
                <span className="fv-workspace__panel-icon" aria-hidden>
                  <ActiveModuleIcon size={18} strokeWidth={2.25} />
                </span>
                {activeDef.label}
              </h2>
              <p>{activeDef.hint}</p>
            </header>

            {error ? (
              <p className="fv-workspace__error" role="alert">
                {error}
              </p>
            ) : null}
            {savedFlash ? (
              <p className="fv-workspace__success" role="status">
                {savedFlash}
              </p>
            ) : null}

            <div className="fv-workspace__editor">
              {activeModule === 'identity' ? (
                <FoodVenueIdentityModule values={form} onChange={patchForm} />
              ) : null}
              {activeModule === 'location' ? (
                <FoodVenueLocationModule values={form} onChange={patchForm} />
              ) : null}
              {activeModule === 'hours' ? (
                <OpeningHoursEditor schedule={hours} onChange={setHours} />
              ) : null}
              {activeModule === 'contact' ? (
                <FoodVenueContactModule values={form} onChange={patchForm} />
              ) : null}
              {activeModule === 'service' ? (
                <FoodVenueServiceModule values={form} onChange={patchForm} />
              ) : null}
              {activeModule === 'photos' ? (
                <div className="fv-module fv-module--photos">
                  <FoodVenuePhotoEditor values={form} onChange={patchForm} />
                  {form.cover_image_file || form.gallery_files.length > 0 ? (
                    <p className="fv-module__note">Uploads save when you tap Save photos.</p>
                  ) : null}
                </div>
              ) : null}
              {activeModule === 'stories' ? (
                <div className="fv-module">
                  <header className="fv-module__head">
                    <h3>Highlight stories</h3>
                    <p>Optional reels for discovery — not required to publish.</p>
                  </header>
                  <FoodVenueStoriesEditor
                    channels={form.venue_stories}
                    onChange={(venue_stories) => patchForm({ venue_stories })}
                  />
                </div>
              ) : null}
            </div>

            {canManage ? (
              <footer className="fv-workspace__foot">
                <div className="fv-workspace__foot-meta">
                  <p className="fv-workspace__autosave-hint">Changes auto-save after you pause typing.</p>
                  {saveStatusLabel ? (
                    <p
                      className={`fv-workspace__save-status fv-workspace__save-status--${saveState}`}
                      role="status"
                      aria-live="polite"
                    >
                      {saveStatusLabel}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="prov-ui__btn prov-ui__btn--primary"
                  disabled={saveMut.isPending}
                  onClick={handleSave}
                >
                  {saveMut.isPending ? 'Saving…' : saveLabel(activeModule)}
                </button>
              </footer>
            ) : (
              <p className="fv-workspace__readonly">View only — you cannot edit this venue.</p>
            )}
          </section>
        ) : null}
      </div>
    </div>
  )
}
