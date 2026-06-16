import { MUSIC_OPTIONS } from './types'

type Props = {
  music: string
  onMusicChange: (value: string) => void
  musicFile: File | null
  onMusicFileChange: (file: File | null) => void
}

export function MusicPicker({ music, onMusicChange, musicFile, onMusicFileChange }: Props) {
  return (
    <div className="create-panel">
      <p className="create-panel__title">Music</p>
      <p className="create-panel__hint">Add a vibe for video posts and stories. Audio preview is local for now.</p>
      <select className="create-panel__select" value={music} onChange={(event) => onMusicChange(event.target.value)}>
        {MUSIC_OPTIONS.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <label className="create-panel__upload">
        <input type="file" accept="audio/*" onChange={(event) => onMusicFileChange(event.target.files?.[0] ?? null)} />
        {musicFile ? musicFile.name : 'Upload your own audio'}
      </label>
    </div>
  )
}
