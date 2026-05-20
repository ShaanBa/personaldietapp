import { useState } from 'react'
import MacroRing from './MacroRing'

export default function Dashboard({
  totals,
  goals,
  onUpdateGoals,
  water,
  onUpdateWater,
  viewMode,
  onViewModeChange,
}) {
  const [showGoalEditor, setShowGoalEditor] = useState(false)
  const [editGoals, setEditGoals] = useState(goals)

  const remaining = goals.calories - totals.calories
  const isOver = remaining < 0

  const handleSaveGoals = () => {
    // If weekly view, scale back before saving
    const scale = viewMode === 'weekly' ? 1/7 : 1
    onUpdateGoals({
      calories: Math.round(editGoals.calories * scale),
      protein: Math.round(editGoals.protein * scale),
      carbs: Math.round(editGoals.carbs * scale),
      fats: Math.round(editGoals.fats * scale),
    })
    setShowGoalEditor(false)
  }

  const openEditor = () => {
    // If weekly, display daily values in editor for clarity
    const scale = viewMode === 'weekly' ? 1/7 : 1
    setEditGoals({
      calories: Math.round(goals.calories * scale),
      protein: Math.round(goals.protein * scale),
      carbs: Math.round(goals.carbs * scale),
      fats: Math.round(goals.fats * scale),
    })
    setShowGoalEditor(true)
  }

  // Calculate water progress (goal: 2000ml / 8 glasses)
  const WATER_GOAL = 2000
  const waterProgress = Math.min(100, (water / WATER_GOAL) * 100)
  const glasses = Array.from({ length: 8 })

  return (
    <section className="dashboard">
      <div className="dashboard-controls">
        <div className="view-toggle-pill">
          <button
            className={`toggle-btn ${viewMode === 'daily' ? 'active' : ''}`}
            onClick={() => onViewModeChange('daily')}
          >
            Daily
          </button>
          <button
            className={`toggle-btn ${viewMode === 'weekly' ? 'active' : ''}`}
            onClick={() => onViewModeChange('weekly')}
          >
            Weekly
          </button>
        </div>
      </div>

      <div className="glass-card calorie-ring-container">
        <div className="calorie-ring-wrapper">
          <MacroRing consumed={totals.calories} goal={goals.calories} />
          <div className="calorie-ring-text">
            <div className="consumed">{Math.round(totals.calories)}</div>
            <div className="goal-label">
              of {goals.calories} cal {viewMode === 'weekly' && '(7d)'}
            </div>
            <div className={`remaining ${isOver ? 'over' : ''}`}>
              {isOver
                ? `${Math.abs(Math.round(remaining))} over`
                : `${Math.round(remaining)} left`}
            </div>
          </div>
        </div>

        <button className="goal-editor-trigger" onClick={openEditor}>
          ⚙ Edit Goals
        </button>

        <div className="macros-row">
          <div className="macro-pill protein">
            <div className="macro-label">Protein</div>
            <div className="macro-value">
              {Math.round(totals.protein)}
              <span className="macro-unit">g</span>
            </div>
            <div className="macro-bar-track">
              <div
                className="macro-bar-fill"
                style={{
                  width: `${Math.min(100, (totals.protein / goals.protein) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="macro-pill carbs">
            <div className="macro-label">Carbs</div>
            <div className="macro-value">
              {Math.round(totals.carbs)}
              <span className="macro-unit">g</span>
            </div>
            <div className="macro-bar-track">
              <div
                className="macro-bar-fill"
                style={{
                  width: `${Math.min(100, (totals.carbs / goals.carbs) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="macro-pill fats">
            <div className="macro-label">Fats</div>
            <div className="macro-value">
              {Math.round(totals.fats)}
              <span className="macro-unit">g</span>
            </div>
            <div className="macro-bar-track">
              <div
                className="macro-bar-fill"
                style={{
                  width: `${Math.min(100, (totals.fats / goals.fats) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Water Tracker Widget */}
      {viewMode === 'daily' && (
        <div className="glass-card water-tracker-container">
          <div className="water-header">
            <div className="water-title">
              <span className="water-icon">💧</span> Hydration
            </div>
            <div className="water-summary">
              <strong>{water} ml</strong> of {WATER_GOAL} ml ({Math.round(water / 250)}/8 glasses)
            </div>
          </div>

          <div className="water-progress-bar">
            <div className="water-progress-fill" style={{ width: `${waterProgress}%` }} />
          </div>

          <div className="water-glasses-grid">
            {glasses.map((_, idx) => {
              const currentVol = (idx + 1) * 250
              const isFilled = water >= currentVol
              const isPartial = water > currentVol - 250 && water < currentVol
              return (
                <div
                  key={idx}
                  className={`water-glass ${isFilled ? 'filled' : ''} ${isPartial ? 'partial' : ''}`}
                  onClick={() => {
                    if (!isFilled) onUpdateWater(250)
                  }}
                  style={{
                    '--fill-level': isPartial ? `${((water % 250) / 250) * 100}%` : '0%'
                  }}
                >
                  🥛
                </div>
              )
            })}
          </div>

          <div className="water-actions">
            <button className="water-btn remove" onClick={() => onUpdateWater(-250)}>
              − 250ml
            </button>
            <button className="water-btn add" onClick={() => onUpdateWater(250)}>
              + 250ml (8oz)
            </button>
          </div>
        </div>
      )}

      {showGoalEditor && (
        <div className="goal-editor-modal">
          <div
            className="goal-editor-backdrop"
            onClick={() => setShowGoalEditor(false)}
          />
          <div className="goal-editor-content">
            <h3>Daily Goals</h3>
            <div className="goal-field">
              <label>Calories</label>
              <input
                type="number"
                value={editGoals.calories}
                onChange={(e) =>
                  setEditGoals((prev) => ({
                    ...prev,
                    calories: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="goal-field">
              <label>Protein (g)</label>
              <input
                type="number"
                value={editGoals.protein}
                onChange={(e) =>
                  setEditGoals((prev) => ({
                    ...prev,
                    protein: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="goal-field">
              <label>Carbs (g)</label>
              <input
                type="number"
                value={editGoals.carbs}
                onChange={(e) =>
                  setEditGoals((prev) => ({
                    ...prev,
                    carbs: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="goal-field">
              <label>Fats (g)</label>
              <input
                type="number"
                value={editGoals.fats}
                onChange={(e) =>
                  setEditGoals((prev) => ({
                    ...prev,
                    fats: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="goal-editor-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowGoalEditor(false)}
              >
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveGoals}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
