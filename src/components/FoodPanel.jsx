import { useState, useMemo, useRef, useEffect } from 'react'

export default function FoodPanel({ foods, customMeals, logs, onAdd, onSaveDirectCustomMeal, onClose }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [qtyFood, setQtyFood] = useState(null)
  const [qty, setQty] = useState(1)
  const searchRef = useRef(null)

  // Scanner States
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const scannerRef = useRef(null)

  // Quick Add States
  const [quickName, setQuickName] = useState('')
  const [quickCals, setQuickCals] = useState('')
  const [quickPro, setQuickPro] = useState('')
  const [quickCarbs, setQuickCarbs] = useState('')
  const [quickFats, setQuickFats] = useState('')
  const [saveAsMeal, setSaveAsMeal] = useState(false)

  useEffect(() => {
    if (searchRef.current && activeCategory !== 'Quick Add') {
      searchRef.current.focus()
    }
  }, [activeCategory])

  // Extract recently logged foods (frequency based)
  const recentItems = useMemo(() => {
    const counts = {}
    const details = {}
    Object.keys(logs || {}).forEach((key) => {
      const dayEntries = logs[key] || []
      dayEntries.forEach((e) => {
        if (e.portion === 'Quick Add' || e.name.startsWith('Quick Add')) return
        counts[e.name] = (counts[e.name] || 0) + 1
        details[e.name] = {
          id: e.foodId || `recent_${e.id}`,
          name: e.name,
          portion: e.portion,
          calories: Math.round(e.calories / e.qty),
          protein: Math.round((e.protein / e.qty) * 10) / 10,
          carbs: Math.round((e.carbs / e.qty) * 10) / 10,
          fats: Math.round((e.fats / e.qty) * 10) / 10,
          emoji: '🍽'
        }
      })
    })
    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a])
    return sorted.slice(0, 8).map((name) => details[name])
  }, [logs])

  const allItems = useMemo(() => {
    let dbItems = []
    if (Array.isArray(foods)) {
      dbItems = foods.map((item, index) => {
        let emoji = item.emoji || '🍽️'
        if (!item.emoji) {
          if (item.category === 'Poultry') emoji = '🍗'
          else if (item.category === 'Bakery') emoji = '🍞'
          else if (item.category === 'Condiments') emoji = '🥣'
          else if (item.category === 'Proteins') emoji = '🥩'
        }

        return {
          id: item.id || `${item.productName}_${index}`,
          name: item.productName,
          portion: item.estimatedServingSize,
          calories: item.calories,
          protein: item.macronutrients?.protein_g || 0,
          carbs: item.macronutrients?.totalCarbohydrate_g || 0,
          fats: item.macronutrients?.totalFat_g || 0,
          category: item.category || 'Other',
          emoji
        }
      })
    } else {
      dbItems = foods?.categories?.flatMap((cat) =>
        cat.items.map((item) => ({ ...item, category: cat.name, emoji: cat.emoji }))
      ) || []
    }

    const mealItems = (customMeals || []).map((meal) => ({
      id: meal.id,
      name: meal.productName,
      portion: meal.estimatedServingSize,
      calories: meal.calories,
      protein: meal.macronutrients?.protein_g || 0,
      carbs: meal.macronutrients?.totalCarbohydrate_g || 0,
      fats: meal.macronutrients?.totalFat_g || 0,
      category: 'Custom Meals',
      emoji: meal.emoji || '🍱'
    }))

    return [...dbItems, ...mealItems]
  }, [foods, customMeals])

  const categoryNames = useMemo(() => {
    let cats = []
    if (Array.isArray(foods)) {
      const uniqueCats = Array.from(
        new Set(
          allItems
            .filter((f) => f.category !== 'Custom Meals')
            .map((f) => `${f.emoji} ${f.category}`)
        )
      )
      cats = uniqueCats
    } else {
      cats = foods?.categories?.map((c) => `${c.emoji} ${c.name}`) || []
    }

    const tabs = ['All']
    if (recentItems.length > 0) tabs.push('🕒 Recent')
    if (customMeals && customMeals.length > 0) tabs.push('🍱 Custom Meals')
    tabs.push('⚡ Quick Add')
    return [...tabs, ...cats]
  }, [foods, allItems, recentItems, customMeals])

  const filteredItems = useMemo(() => {
    if (activeCategory === 'Recent') return recentItems
    if (activeCategory === 'Custom Meals') {
      return allItems.filter((i) => i.category === 'Custom Meals')
    }
    if (activeCategory === 'Quick Add') return []

    // Hide Custom Meals from the standard grid lists
    let items = allItems.filter((i) => i.category !== 'Custom Meals')

    if (activeCategory !== 'All') {
      items = items.filter((i) => i.category === activeCategory)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.portion.toLowerCase().includes(q)
      )
    }

    return items
  }, [allItems, activeCategory, search, recentItems])

  const handleOpenQty = (food) => {
    setQtyFood(food)
    setQty(1)
  }

  const handleConfirmAdd = () => {
    if (qtyFood) {
      onAdd(qtyFood, qty)
      setQtyFood(null)
    }
  }

  const adjustQty = (delta) => {
    setQty((prev) => {
      const next = prev + delta
      if (next < 0.25) return 0.25
      return Math.round(next * 4) / 4
    })
  }

  const handleQuickAdd = (e) => {
    e.preventDefault()
    const cals = parseInt(quickCals) || 0
    const food = {
      id: `quick_${Date.now()}`,
      name: quickName.trim() || 'Quick Add Item',
      portion: 'Quick Add',
      calories: cals,
      protein: parseFloat(quickPro) || 0,
      carbs: parseFloat(quickCarbs) || 0,
      fats: parseFloat(quickFats) || 0,
    }
    onAdd(food, 1)
    if (saveAsMeal && onSaveDirectCustomMeal) {
      onSaveDirectCustomMeal({
        id: `meal_${Date.now()}`,
        productName: quickName.trim() || 'Quick Add Item',
        estimatedServingSize: '1 serving',
        calories: cals,
        macronutrients: {
          protein_g: parseFloat(quickPro) || 0,
          totalCarbohydrate_g: parseFloat(quickCarbs) || 0,
          totalFat_g: parseFloat(quickFats) || 0,
        },
        emoji: '🍱',
        isMeal: true
      })
    }
    setQuickName('')
    setQuickCals('')
    setQuickPro('')
    setQuickCarbs('')
    setQuickFats('')
    setSaveAsMeal(false)
    onClose()
  }

  // Scanner scanner setup
  const startScanner = () => {
    setIsScanning(true)
    setScanError('')
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error)
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  const handleBarcodeScanned = (barcode) => {
    setSearch(`Searching barcode: ${barcode}...`)
    fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 1 && data.product) {
          const prod = data.product
          const nut = prod.nutriments || {}
          
          // Get values per serving or fallback to 100g
          const calories = Math.round(
            nut['energy-kcal_serving'] ||
            nut['energy-kcal_100g'] ||
            nut['energy-kcal'] ||
            0
          )
          const protein = Math.round((nut.proteins_serving || nut.proteins_100g || 0) * 10) / 10
          const carbs = Math.round((nut.carbohydrates_serving || nut.carbohydrates_100g || 0) * 10) / 10
          const fats = Math.round((nut.fat_serving || nut.fat_100g || 0) * 10) / 10

          const food = {
            id: `barcode_${barcode}`,
            name: prod.product_name || prod.generic_name || `Scanned Food (${barcode})`,
            portion: prod.serving_size || '1 serving',
            calories,
            protein,
            carbs,
            fats,
            emoji: '🔍'
          }
          setSearch('')
          handleOpenQty(food)
        } else {
          setSearch('')
          alert(`Product not found for barcode: ${barcode}`)
        }
      })
      .catch((err) => {
        console.error(err)
        setSearch('')
        alert("Network error searching product.")
      })
  }

  useEffect(() => {
    if (isScanning) {
      // Delay initialization slightly to let reader container render
      setTimeout(() => {
        try {
          if (!window.Html5Qrcode) {
            setScanError('Scanner library not loaded. Please try again.')
            return
          }
          const html5Qrcode = new window.Html5Qrcode('reader')
          scannerRef.current = html5Qrcode
          html5Qrcode
            .start(
              { facingMode: 'environment' },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
              },
              (decodedText) => {
                stopScanner()
                handleBarcodeScanned(decodedText)
              },
              () => {
                // Ignore scanning failures to prevent logging clutter
              }
            )
            .catch((err) => {
              console.error(err)
              setScanError('Failed to access camera. Check browser permissions.')
            })
        } catch (e) {
          console.error(e)
          setScanError('Scanner initialization error.')
        }
      }, 300)
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error)
        scannerRef.current = null
      }
    }
  }, [isScanning])

  return (
    <div className="food-panel-overlay">
      <div className="food-panel-backdrop" onClick={onClose} />
      <div className="food-panel">
        <div className="food-panel-handle" />
        <button className="food-panel-close" onClick={onClose}>
          ×
        </button>

        <div className="section-label">Add Food</div>

        {activeCategory !== 'Quick Add' && (
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search foods..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="barcode-scan-btn" onClick={startScanner} title="Scan Barcode">
              📷 Scan
            </button>
          </div>
        )}

        {categoryNames.length > 1 && (
          <div className="category-tabs">
            {categoryNames.map((name) => (
              <button
                key={name}
                className={`category-tab ${
                  activeCategory === name ||
                  (name !== 'All' && name.includes(activeCategory)) ||
                  (activeCategory === 'All' && name === 'All')
                    ? ''
                    : ''
                } ${
                  (name === 'All' && activeCategory === 'All') ||
                  (name !== 'All' && name.includes(activeCategory) && activeCategory !== 'All')
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setActiveCategory(
                    name === 'All'
                      ? 'All'
                      : name.substring(name.indexOf(' ') + 1)
                  )
                }
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {activeCategory === 'Quick Add' ? (
          <form className="quick-add-form" onSubmit={handleQuickAdd}>
            <div className="goal-field">
              <label>Food Name</label>
              <input
                type="text"
                placeholder="e.g. Oily Curry, Snicker Bar"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
              />
            </div>
            <div className="goal-field">
              <label>Calories (kcal)*</label>
              <input
                type="number"
                required
                min="0"
                placeholder="e.g. 350"
                value={quickCals}
                onChange={(e) => setQuickCals(e.target.value)}
              />
            </div>
            <div className="macros-grid">
              <div className="goal-field">
                <label>Protein (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={quickPro}
                  onChange={(e) => setQuickPro(e.target.value)}
                />
              </div>
              <div className="goal-field">
                <label>Carbs (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={quickCarbs}
                  onChange={(e) => setQuickCarbs(e.target.value)}
                />
              </div>
              <div className="goal-field">
                <label>Fats (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={quickFats}
                  onChange={(e) => setQuickFats(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0 0 0' }}>
              <input
                type="checkbox"
                id="saveAsMeal"
                checked={saveAsMeal}
                onChange={(e) => setSaveAsMeal(e.target.checked)}
                style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
              />
              <label htmlFor="saveAsMeal" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                Save as a reusable Custom Meal
              </label>
            </div>
            <button type="submit" className="qty-add-btn" style={{ marginTop: '20px' }}>
              Add Quick Food Entry
            </button>
          </form>
        ) : (
          <div className="food-grid">
            {filteredItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                {search.trim() ? 'No foods found' : 'No foods available in this tab'}
              </div>
            ) : (
              filteredItems.map((food) => (
                <div key={food.id} className="food-item" onClick={() => handleOpenQty(food)}>
                  <div className="food-item-info">
                    <div className="food-item-name">
                      {food.emoji && <span style={{ marginRight: '6px' }}>{food.emoji}</span>}
                      {food.name}
                    </div>
                    <div className="food-item-portion">{food.portion}</div>
                  </div>
                  <div className="food-item-macros">
                    <span className="food-item-cal">{food.calories} cal</span>
                    <button
                      className="food-item-add"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAdd(food, 1)
                      }}
                      aria-label={`Quick add ${food.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Quantity Modal */}
      {qtyFood && (
        <div className="qty-modal">
          <div className="qty-backdrop" onClick={() => setQtyFood(null)} />
          <div className="qty-content">
            <h3>{qtyFood.name}</h3>
            <div className="qty-portion">{qtyFood.portion}</div>

            <div className="qty-controls">
              <button className="qty-btn" onClick={() => adjustQty(-0.5)}>
                −
              </button>
              <input
                type="number"
                step="any"
                min="0"
                className="qty-display-input"
                value={qty}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val)) setQty(val)
                  else setQty('')
                }}
                onBlur={() => {
                  if (!qty || qty <= 0) setQty(1)
                }}
              />
              <button className="qty-btn" onClick={() => adjustQty(0.5)}>
                +
              </button>
            </div>

            <div className="qty-macros-preview">
              <div className="qty-macro-item">
                <div className="val" style={{ color: 'var(--accent-primary)' }}>
                  {Math.round(qtyFood.calories * qty)}
                </div>
                <div className="lbl">Cal</div>
              </div>
              <div className="qty-macro-item">
                <div className="val" style={{ color: 'var(--color-protein)' }}>
                  {Math.round(qtyFood.protein * qty)}g
                </div>
                <div className="lbl">Protein</div>
              </div>
              <div className="qty-macro-item">
                <div className="val" style={{ color: 'var(--color-carbs)' }}>
                  {Math.round(qtyFood.carbs * qty)}g
                </div>
                <div className="lbl">Carbs</div>
              </div>
              <div className="qty-macro-item">
                <div className="val" style={{ color: 'var(--color-fats)' }}>
                  {Math.round(qtyFood.fats * qty)}g
                </div>
                <div className="lbl">Fats</div>
              </div>
            </div>

            <button className="qty-add-btn" onClick={handleConfirmAdd}>
              Add {qty > 1 ? `${qty}× ` : ''}{qtyFood.name}
            </button>
          </div>
        </div>
      )}

      {/* Camera Scanner Modal */}
      {isScanning && (
        <div className="qty-modal" style={{ zIndex: 1100 }}>
          <div className="qty-backdrop" onClick={stopScanner} />
          <div className="qty-content scanner-content">
            <h3>Scan Barcode</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
              Hold a product barcode up to the camera to scan it automatically.
            </p>
            <div id="reader" className="scanner-reader-view"></div>
            {scanError && <p className="scan-error-msg">{scanError}</p>}
            <button className="qty-add-btn" style={{ marginTop: '15px', background: '#e94057' }} onClick={stopScanner}>
              Close Camera
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
