import { useState } from 'react'

export default function DailyLog({
  entries,
  onRemove,
  yesterdayHasEntries,
  onCopyYesterday,
  onSaveCustomMeal,
}) {
  const [selectedIds, setSelectedIds] = useState([])
  const [mealName, setMealName] = useState('')
  const [showMealSaver, setShowMealSaver] = useState(false)

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSaveMeal = (e) => {
    e.preventDefault()
    if (!mealName.trim() || selectedIds.length === 0) return
    onSaveCustomMeal(mealName.trim(), selectedIds)
    setMealName('')
    setSelectedIds([])
    setShowMealSaver(false)
  }

  if (entries.length === 0) {
    return (
      <section className="daily-log">
        <div className="section-label">Today's Log</div>
        <div className="glass-card log-empty">
          <div className="empty-icon">🍽️</div>
          <p style={{ marginBottom: '15px' }}>No foods logged yet</p>
          {yesterdayHasEntries && (
            <button className="copy-yesterday-btn" onClick={onCopyYesterday}>
              📋 Copy Yesterday's Foods
            </button>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="daily-log">
      <div className="section-label-row">
        <div className="section-label">
          Today's Log · {entries.length} item{entries.length !== 1 ? 's' : ''}
        </div>
        {selectedIds.length > 0 && (
          <button
            className="save-meal-trigger-btn"
            onClick={() => setShowMealSaver(true)}
          >
            🍱 Create Meal ({selectedIds.length})
          </button>
        )}
      </div>

      <div className="glass-card" style={{ padding: '10px' }}>
        <div className="log-list">
          {entries.map((entry) => (
            <div key={entry.id} className={`log-entry ${selectedIds.includes(entry.id) ? 'selected' : ''}`}>
              <div className="log-entry-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(entry.id)}
                  onChange={() => toggleSelect(entry.id)}
                  className="log-entry-checkbox"
                  id={`check-${entry.id}`}
                />
                <label htmlFor={`check-${entry.id}`} className="log-entry-checkbox-label" />
              </div>

              <div className="log-entry-info" onClick={() => toggleSelect(entry.id)} style={{ cursor: 'pointer' }}>
                <div className="log-entry-name">
                  {entry.qty > 1 && `${entry.qty}× `}
                  {entry.name}
                </div>
                <div className="log-entry-detail">
                  {entry.portion} · P:{entry.protein}g C:{entry.carbs}g F:{entry.fats}g
                </div>
              </div>
              
              <div className="log-entry-right">
                <span className="log-entry-cals">{entry.calories}</span>
                <button
                  className="log-entry-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(entry.id)
                  }}
                  aria-label="Remove entry"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showMealSaver && (
        <div className="goal-editor-modal">
          <div className="goal-editor-backdrop" onClick={() => setShowMealSaver(false)} />
          <form className="goal-editor-content" onSubmit={handleSaveMeal}>
            <h3>Save Custom Meal</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>
              Create a custom meal from the {selectedIds.length} selected items to easily log them again later.
            </p>
            <div className="goal-field">
              <label>Meal Name</label>
              <input
                type="text"
                required
                placeholder="e.g. My Protein Shake, Heavy Breakfast"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
              />
            </div>
            <div className="goal-editor-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowMealSaver(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-save">
                Save Recipe
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
