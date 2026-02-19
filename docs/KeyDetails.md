# 📋 Key Details Component — Usage Guide

## Quick Start

### Option 1: With Built-in Styles (Recommended)

```tsx
// app/article/[id]/page.tsx
import KeyDetails from '@/components/KeyDetails';

export default function ArticlePage({ article }) {
  return (
    <div className="article-layout">
      <main>
        {/* Your main content */}
      </main>
      
      <aside className="sidebar">
        <KeyDetails entities={article.entities} />
      </aside>
    </div>
  );
}
```

### Option 2: With External CSS

```tsx
// app/article/[id]/page.tsx
import '@/styles/KeyDetails.css';

export default function ArticlePage({ article }) {
  return (
    <div className="sidebar">
      <div className="key-details-card">
        <h3 className="card-title">
          <span className="title-icon">📋</span>
          Key Details
        </h3>
        <div className="details-list">
          {/* Render details manually */}
        </div>
      </div>
    </div>
  );
}
```

---

## Data Structure

The component expects an `entities` object with these optional fields:

```typescript
interface Entities {
  airline?: string;          // e.g. "JetBlue Airways"
  aircraftType?: string;     // e.g. "Airbus A320"
  registration?: string;     // e.g. "N123JB"
  location?: string;         // e.g. "Newark Liberty Intl (EWR)"
  date?: string;            // ISO date: "2026-02-19"
  authority?: string;        // e.g. "FAA"
  severity?: 'minor' | 'serious' | 'fatal' | 'unknown';
}
```

---

## Example Usage

### Accident Article:
```tsx
<KeyDetails 
  entities={{
    airline: "JetBlue Airways",
    aircraftType: "Airbus A320",
    registration: "N615JB",
    location: "Newark Liberty Intl (EWR)",
    date: "2026-02-19",
    authority: "FAA",
    severity: "serious"
  }}
/>
```

**Renders:**
```
┌────────────────────────────┐
│ 📋 Key Details             │
├────────────────────────────┤
│ ✈️ AIRLINE                 │
│ JetBlue Airways            │
│                            │
│ 🛩 AIRCRAFT                │
│ Airbus A320                │
│                            │
│ 🔖 REGISTRATION            │
│ N615JB                     │
│                            │
│ 📍 LOCATION                │
│ Newark Liberty Intl (EWR)  │
│                            │
│ 📅 DATE                    │
│ February 19, 2026          │
│                            │
│ 🏛 AUTHORITY               │
│ FAA                        │
│                            │
│ 🚨 SEVERITY                │
│ SERIOUS  (in orange)       │
└────────────────────────────┘
```

### Regulatory Article:
```tsx
<KeyDetails 
  entities={{
    authority: "EASA",
    aircraftType: "Boeing 737 MAX",
    date: "2026-02-15"
  }}
/>
```

**Renders:**
```
┌────────────────────────────┐
│ 📋 Key Details             │
├────────────────────────────┤
│ 🛩 AIRCRAFT                │
│ Boeing 737 MAX             │
│                            │
│ 📅 DATE                    │
│ February 15, 2026          │
│                            │
│ 🏛 AUTHORITY               │
│ EASA                       │
└────────────────────────────┘
```

**Note:** Only fields with values are shown. Empty fields are automatically hidden.

---

## Severity Color Coding

The `severity` field has special styling:

| Severity | Color | Hex | Use Case |
|----------|-------|-----|----------|
| **MINOR** | Yellow | `#fbbf24` | No injuries, minor damage |
| **SERIOUS** | Orange | `#f97316` | Injuries, significant incident |
| **FATAL** | Red | `#ef4444` | Casualties reported |
| **UNKNOWN** | Gray | `#94a3b8` | Severity not yet determined |

Example:
```tsx
severity: "fatal"  // Renders in bright red with glow
```

---

## Customization

### Change Background Color:
```css
.key-details-card {
  background: #0f172a; /* Darker */
}
```

### Change Icon Size:
```css
.label-icon {
  font-size: 16px; /* Bigger icons */
}
```

### Add More Fields:

In `KeyDetails.tsx`, add to the `fields` array:
```typescript
{
  key: 'flightNumber',
  icon: '✈️',
  label: 'FLIGHT',
  value: entities.flightNumber,
},
```

### Remove Hover Effect:
```css
.key-details-card .detail-item:hover {
  background: none; /* Remove hover */
}
```

---

## Integration with Prisma

Update your Prisma schema to store entities:

```prisma
model Article {
  id          String   @id @default(uuid())
  title       String
  // ... other fields
  
  // Store entities as JSON
  entities    Json?    // { airline, aircraftType, location, etc. }
}
```

Fetch in your page:
```typescript
const article = await prisma.article.findUnique({
  where: { id: params.id },
  select: {
    id: true,
    title: true,
    entities: true, // ← Gets the JSON object
  },
});

// Use in component
<KeyDetails entities={article.entities} />
```

---

## Accessibility

The component includes:
- ✅ Semantic HTML (`<dl>`, `<dt>`, `<dd>`)
- ✅ High contrast ratios (WCAG AA)
- ✅ Screen reader friendly labels
- ✅ Keyboard navigation support

---

## Troubleshooting

### Issue: Component not showing
**Fix:** Check if `entities` object has any values:
```typescript
console.log('Entities:', article.entities);
// Should output: { airline: "...", aircraftType: "...", ... }
```

### Issue: Date showing as "Invalid Date"
**Fix:** Ensure date is in ISO format:
```typescript
date: "2026-02-19" // ✅ Correct
date: "Feb 19, 2026" // ❌ Wrong
```

### Issue: Severity not colored
**Fix:** Check spelling (case-sensitive):
```typescript
severity: "serious" // ✅ Correct (lowercase)
severity: "SERIOUS" // ❌ Wrong
```

---

## Live Demo

See the visual mockup: `article-mockup.html`

Or test with this data:
```typescript
const testEntities = {
  airline: "JetBlue Airways",
  aircraftType: "Airbus A320",
  location: "Newark Liberty Intl (EWR)",
  date: "2026-02-19",
  authority: "FAA",
  severity: "serious"
};

<KeyDetails entities={testEntities} />
```

---

## Next Steps

1. **Copy** `KeyDetails.tsx` to your `/components` folder
2. **Import** in your article detail page
3. **Pass** the `entities` object from your article data
4. **Test** with different severity levels
5. **Customize** colors to match your brand

Done! 🎉
