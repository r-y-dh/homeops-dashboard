import { useState, useRef } from 'react'
import { Camera, Images, FileArrowUp, CircleNotch } from '@phosphor-icons/react'
import { T } from '../lib/constants'

/**
 * Dropdown button: Add Camera / Photos / Upload file
 * Props:
 *   onFile(file)  – called with the selected File object
 *   loading       – shows spinner and disables button
 *   label         – button label (default "Add file or photo")
 *   accept        – file accept string for "Upload file" option
 */
export default function AddFileDropdown({
  onFile,
  loading = false,
  label = 'Add file or photo',
  accept = 'image/*,application/pdf',
}) {
  const [open, setOpen] = useState(false)
  const cameraRef = useRef()
  const photoRef  = useRef()
  const fileRef   = useRef()

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  const pick = (ref) => {
    setOpen(false)
    ref.current?.click()
  }

  const menuItems = [
    { icon: <Camera size={14} />,      text: 'Add Camera',  ref: cameraRef },
    { icon: <Images size={14} />,      text: 'Photos',      ref: photoRef  },
    { icon: <FileArrowUp size={14} />, text: 'Upload file', ref: fileRef   },
  ]

  return (
    <div style={{ position: 'relative' }}>
      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleChange} />
      <input ref={photoRef}  type="file" accept="image/*" style={{ display: 'none' }} onChange={handleChange} />
      <input ref={fileRef}   type="file" accept={accept}  style={{ display: 'none' }} onChange={handleChange} />

      {/* Trigger button */}
      <button
        onClick={() => !loading && setOpen(!open)}
        disabled={loading}
        style={{
          background: T.cardAlt,
          color: T.cyan,
          border: `1px solid ${T.cyanDim}`,
          borderRadius: 7,
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 600,
          cursor: loading ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          opacity: loading ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {loading
          ? <><CircleNotch size={14} style={{ animation: 'spin 1s linear infinite' }} /> Reading…</>
          : <>{label} <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span></>
        }
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0,
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 8, overflow: 'hidden', zIndex: 100,
            minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}>
            {menuItems.map(({ icon, text, ref }) => (
              <button
                key={text}
                onClick={() => pick(ref)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  width: '100%', background: 'none', border: 'none',
                  padding: '10px 14px', color: T.text, fontSize: 13,
                  cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.cardAlt}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ color: T.cyan }}>{icon}</span>
                {text}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
