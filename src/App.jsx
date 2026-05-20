import { useState, useEffect, useCallback, useMemo } from 'react'
import foodsData from './data/foods.json'
import Dashboard from './components/Dashboard'
import DailyLog from './components/DailyLog'
import FoodPanel from './components/FoodPanel'
import Toast from './components/Toast'
import Auth from './components/Auth'
import { getSupabase } from './supabase'
import './index.css'

const STORAGE_KEY = 'dietapp_logs'
const GOALS_KEY = 'dietapp_goals'
const WATER_KEY = 'dietapp_water'
const MEALS_KEY = 'dietapp_meals'

const DEFAULT_GOALS = {
  calories: 2200,
  protein: 150,
  carbs: 250,
  fats: 75,
}

function getDateKey(date) {
  return date.toISOString().split('T')[0]
}

function formatDate(date) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (getDateKey(date) === getDateKey(today)) return 'Today'
  if (getDateKey(date) === getDateKey(yesterday)) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function loadLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveLogs(logs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
}

function loadGoals() {
  try {
    const raw = localStorage.getItem(GOALS_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_GOALS
  } catch {
    return DEFAULT_GOALS
  }
}

function saveGoals(goals) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
}

function loadWater() {
  try {
    const raw = localStorage.getItem(WATER_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveWater(water) {
  localStorage.setItem(WATER_KEY, JSON.stringify(water))
}

function loadMeals() {
  try {
    const raw = localStorage.getItem(MEALS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveMeals(meals) {
  localStorage.setItem(MEALS_KEY, JSON.stringify(meals))
}

export default function App() {
  const supabase = getSupabase()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [logs, setLogs] = useState(loadLogs)
  const [goals, setGoals] = useState(loadGoals)
  const [waterLogs, setWaterLogs] = useState(loadWater)
  const [customMeals, setCustomMeals] = useState(loadMeals)
  const [viewMode, setViewMode] = useState('daily') // 'daily' or 'weekly'
  const [showPanel, setShowPanel] = useState(false)
  const [toast, setToast] = useState(null)

  const [user, setUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  const dateKey = getDateKey(currentDate)
  const todayEntries = logs[dateKey] || []
  const todayWater = waterLogs[dateKey] || 0

  // Listen to auth state changes
  useEffect(() => {
    if (!supabase) {
      setIsDataLoaded(true)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (!session) setIsDataLoaded(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (!session) {
        setIsDataLoaded(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sync function
  const fetchAndSyncUserData = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        // Record exists in cloud! Sync to local
        setLogs((localLogs) => ({ ...localLogs, ...data.logs }))
        setWaterLogs((localWater) => ({ ...localWater, ...data.water }))
        setGoals((localGoals) => ({ ...localGoals, ...data.goals }))
        setCustomMeals((localMeals) => {
          const mealMap = new Map()
          localMeals.forEach(m => mealMap.set(m.id, m))
          const cloudMeals = data.meals || []
          cloudMeals.forEach(m => mealMap.set(m.id, m))
          return Array.from(mealMap.values())
        })
      } else {
        // No record exists in cloud! (First time login).
        // Upload our current local storage data
        const { error: insertError } = await supabase
          .from('user_data')
          .insert({
            id: userId,
            logs: loadLogs(),
            goals: loadGoals(),
            water: loadWater(),
            meals: loadMeals(),
            updated_at: new Date().toISOString()
          })
        if (insertError) throw insertError
      }
    } catch (err) {
      console.error('Error syncing user data:', err)
    } finally {
      setIsDataLoaded(true)
    }
  }, [])

  // Fetch data on login
  useEffect(() => {
    if (user) {
      setIsDataLoaded(false)
      fetchAndSyncUserData(user.id)
    } else {
      setIsDataLoaded(true)
    }
  }, [user, fetchAndSyncUserData])

  // Upload changes to Supabase (debounced)
  useEffect(() => {
    if (!user || !supabase || !isDataLoaded) return

    const timer = setTimeout(async () => {
      try {
        await supabase
          .from('user_data')
          .update({
            logs,
            goals,
            water: waterLogs,
            meals: customMeals,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
      } catch (err) {
        console.error('Error uploading user data:', err)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [logs, goals, waterLogs, customMeals, user, isDataLoaded])

  // Auto-sync: pull latest data when tab becomes visible or every 30s
  useEffect(() => {
    if (!user || !supabase) return

    const pullLatest = async () => {
      try {
        const { data, error } = await supabase
          .from('user_data')
          .select('logs, goals, water, meals, updated_at')
          .eq('id', user.id)
          .maybeSingle()

        if (error || !data) return

        setLogs(prev => ({ ...prev, ...data.logs }))
        setWaterLogs(prev => ({ ...prev, ...data.water }))
        setGoals(prev => ({ ...prev, ...data.goals }))
        setCustomMeals(prev => {
          const mealMap = new Map()
          prev.forEach(m => mealMap.set(m.id, m))
          const cloudMeals = data.meals || []
          cloudMeals.forEach(m => mealMap.set(m.id, m))
          return Array.from(mealMap.values())
        })
      } catch (err) {
        console.error('Error pulling latest data:', err)
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pullLatest()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    const interval = setInterval(pullLatest, 30000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [user, supabase])

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out? Your local data will remain, but cloud syncing will stop.')) {
      await supabase.auth.signOut()
      // Reload local storage state
      setLogs(loadLogs())
      setGoals(loadGoals())
      setWaterLogs(loadWater())
      setCustomMeals(loadMeals())
    }
  }

  // Persist logs local backup
  useEffect(() => {
    saveLogs(logs)
  }, [logs])

  // Persist goals
  useEffect(() => {
    saveGoals(goals)
  }, [goals])

  // Persist water
  useEffect(() => {
    saveWater(waterLogs)
  }, [waterLogs])

  // Persist meals
  useEffect(() => {
    saveMeals(customMeals)
  }, [customMeals])

  // Calculate streak data (rolling 7 days ending at currentDate)
  const streakDays = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(currentDate)
      d.setDate(d.getDate() - i)
      const key = getDateKey(d)
      const entries = logs[key] || []
      const dayCals = entries.reduce((sum, e) => sum + e.calories, 0)
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' })
      let status = 'empty'
      if (dayCals > 0) {
        status = dayCals <= goals.calories ? 'success' : 'warning'
      }
      days.push({
        key,
        label: dayLabel,
        status,
        isCurrent: key === dateKey,
        date: d
      })
    }
    return days
  }, [currentDate, logs, goals.calories, dateKey])

  // Calculate totals based on view mode (daily vs 7-day rolling)
  const totals = useMemo(() => {
    if (viewMode === 'daily') {
      return todayEntries.reduce(
        (acc, entry) => ({
          calories: acc.calories + entry.calories,
          protein: acc.protein + entry.protein,
          carbs: acc.carbs + entry.carbs,
          fats: acc.fats + entry.fats,
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      )
    } else {
      let cals = 0, pro = 0, carb = 0, fat = 0
      streakDays.forEach((day) => {
        const dayEntries = logs[day.key] || []
        dayEntries.forEach((entry) => {
          cals += entry.calories
          pro += entry.protein
          carb += entry.carbs
          fat += entry.fats
        })
      })
      return { calories: cals, protein: pro, carbs: carb, fats: fat }
    }
  }, [viewMode, todayEntries, logs, streakDays])

  // Adjust goals for Dashboard rendering
  const dashboardGoals = useMemo(() => {
    if (viewMode === 'weekly') {
      return {
        calories: goals.calories * 7,
        protein: goals.protein * 7,
        carbs: goals.carbs * 7,
        fats: goals.fats * 7,
      }
    }
    return goals
  }, [goals, viewMode])

  const addFood = useCallback((food, qty) => {
    const entry = {
      id: Date.now() + Math.random(),
      foodId: food.id,
      name: food.name,
      portion: food.portion,
      qty,
      calories: Math.round(food.calories * qty),
      protein: Math.round(food.protein * qty * 10) / 10,
      carbs: Math.round(food.carbs * qty * 10) / 10,
      fats: Math.round(food.fats * qty * 10) / 10,
    }

    setLogs((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), entry],
    }))

    setToast(`Added ${qty > 1 ? qty + '× ' : ''}${food.name}`)
    setTimeout(() => setToast(null), 2000)
  }, [dateKey])

  const removeFood = useCallback((entryId) => {
    setLogs((prev) => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).filter((e) => e.id !== entryId),
    }))
  }, [dateKey])

  const updateGoals = useCallback((newGoals) => {
    setGoals(newGoals)
  }, [])

  const updateWater = useCallback((amount) => {
    setWaterLogs((prev) => ({
      ...prev,
      [dateKey]: Math.max(0, (prev[dateKey] || 0) + amount)
    }))
  }, [dateKey])

  const copyYesterdayLog = useCallback(() => {
    const yesterday = new Date(currentDate)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = getDateKey(yesterday)
    const yesterdayEntries = logs[yesterdayKey] || []
    
    if (yesterdayEntries.length === 0) return

    const newEntries = yesterdayEntries.map((e) => ({
      ...e,
      id: Date.now() + Math.random()
    }))

    setLogs((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), ...newEntries]
    }))

    setToast(`Copied ${newEntries.length} items from yesterday!`)
    setTimeout(() => setToast(null), 2000)
  }, [currentDate, logs, dateKey])

  const saveCustomMeal = useCallback((name, entryIds) => {
    const selectedEntries = todayEntries.filter((e) => entryIds.includes(e.id))
    if (selectedEntries.length === 0) return

    const totalCals = selectedEntries.reduce((sum, e) => sum + e.calories, 0)
    const totalPro = selectedEntries.reduce((sum, e) => sum + e.protein, 0)
    const totalCarb = selectedEntries.reduce((sum, e) => sum + e.carbs, 0)
    const totalFat = selectedEntries.reduce((sum, e) => sum + e.fats, 0)

    const newMeal = {
      id: `meal_${Date.now()}`,
      productName: name,
      estimatedServingSize: '1 meal',
      calories: totalCals,
      macronutrients: {
        protein_g: totalPro,
        totalCarbohydrate_g: totalCarb,
        totalFat_g: totalFat
      },
      category: 'Custom Meals',
      emoji: '🍱',
      isMeal: true
    }

    setCustomMeals((prev) => [...prev, newMeal])
    setToast(`Saved custom meal: ${name}`)
    setTimeout(() => setToast(null), 2000)
  }, [todayEntries])

  const addDirectCustomMeal = useCallback((meal) => {
    setCustomMeals((prev) => [...prev, meal])
    setToast(`Saved custom meal: ${meal.productName}`)
    setTimeout(() => setToast(null), 2000)
  }, [])


  const navigateDate = (dir) => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + dir)
      return d
    })
  }

  const isToday = getDateKey(currentDate) === getDateKey(new Date())

  // Check if yesterday had entries
  const yesterdayHasEntries = useMemo(() => {
    const yesterday = new Date(currentDate)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = getDateKey(yesterday)
    return (logs[yesterdayKey] || []).length > 0
  }, [currentDate, logs])

  return (
    <div className="app-container">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1>NutriTrack</h1>
          <button 
            onClick={user ? handleSignOut : () => setShowAuthModal(true)} 
            className={`sync-status-btn ${user ? 'signed-in' : ''}`}
            title={user ? `Signed in as ${user.email}. Click to sign out.` : 'Click to sign in and sync across devices.'}
          >
            {user ? '👤' : '☁️'}
          </button>
        </div>
        <div className="date-nav">
          <button onClick={() => navigateDate(-1)} aria-label="Previous day">
            ‹
          </button>
          <span className={isToday ? 'date-today-badge' : ''}>
            {formatDate(currentDate)}
          </span>
          <button onClick={() => navigateDate(1)} aria-label="Next day">
            ›
          </button>
        </div>
      </header>

      {/* Streak Dots */}
      <div className="streak-dots-container">
        {streakDays.map((day) => (
          <div
            key={day.key}
            className={`streak-dot-wrapper ${day.isCurrent ? 'current' : ''}`}
            onClick={() => setCurrentDate(day.date)}
          >
            <span className="streak-dot-label">{day.label}</span>
            <div className={`streak-dot ${day.status}`} />
          </div>
        ))}
      </div>

      <Dashboard
        totals={totals}
        goals={dashboardGoals}
        onUpdateGoals={updateGoals}
        water={todayWater}
        onUpdateWater={updateWater}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <DailyLog
        entries={todayEntries}
        onRemove={removeFood}
        yesterdayHasEntries={yesterdayHasEntries}
        onCopyYesterday={copyYesterdayLog}
        onSaveCustomMeal={saveCustomMeal}
      />

      <button className="fab-add" onClick={() => setShowPanel(true)}>
        <span className="fab-icon">+</span>
        Add Food
      </button>

      {showPanel && (
        <FoodPanel
          foods={foodsData}
          customMeals={customMeals}
          logs={logs}
          onAdd={addFood}
          onSaveDirectCustomMeal={addDirectCustomMeal}
          onClose={() => setShowPanel(false)}
        />
      )}

      {showAuthModal && (
        <Auth onClose={() => setShowAuthModal(false)} />
      )}

      <Toast message={toast} />
    </div>
  )
}
