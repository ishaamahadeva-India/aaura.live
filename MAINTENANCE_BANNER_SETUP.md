# 🔧 Maintenance Banner Setup

## ✅ Component Created

I've created a `MaintenanceBanner` component that shows an alert message to users.

## 📋 How to Enable/Disable

### Enable the Banner

Add this to your `.env.local` file:

```bash
NEXT_PUBLIC_SHOW_MAINTENANCE_BANNER=true
```

### Disable the Banner

Set it to `false` or remove the variable:

```bash
NEXT_PUBLIC_SHOW_MAINTENANCE_BANNER=false
```

Or simply remove the line from `.env.local`.

## 🎨 Features

- ✅ Shows alert message: "aaura.live is undergoing significant changes. Please visit us on 24-12-2025."
- ✅ Dismissible - Users can close it (stored in localStorage)
- ✅ Fixed at top of page - Visible on all pages
- ✅ Easy to toggle - Just change environment variable
- ✅ Auto-adjusts layout - Adds padding when banner is visible

## 📝 Current Message

The banner shows:
> **aaura.live** is undergoing significant changes. Please visit us on **24-12-2025**.

## 🔄 To Remove After Issues Resolved

1. **Set environment variable to false:**
   ```bash
   NEXT_PUBLIC_SHOW_MAINTENANCE_BANNER=false
   ```

2. **Or remove the variable** from `.env.local`

3. **Restart dev server** (if running)

4. **Deploy** - Banner will be gone ✅

## 🎯 Customization

To change the message or date, edit:
- File: `src/components/MaintenanceBanner.tsx`
- Line: Update the message text

## 📍 Location

The banner appears:
- At the top of every page
- Fixed position (stays visible when scrolling)
- Above all other content

## ✅ Status

- ✅ Component created
- ✅ Added to layout
- ✅ Environment variable toggle ready
- ✅ Dismissible functionality added
- ⏳ **YOU NEED TO**: Add `NEXT_PUBLIC_SHOW_MAINTENANCE_BANNER=true` to `.env.local`

