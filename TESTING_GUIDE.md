# Quick Start Guide: Testing Shift Scheduling Features

## Step-by-Step Testing Instructions

### Part 1: Admin Creates Open Shifts (FR-14)

1. **Login as Admin**
   - Open http://localhost:3000
   - Email: `admin@example.com`
   - Password: `password123`

2. **Navigate to Schedule Tab**
   - Click the "Schedule" tab in the navigation

3. **Create Your First Open Shift**
   - Fill out the "Publish Open Shift" form:
     - **Date**: Select tomorrow's date
     - **Start Time**: 08:00 AM
     - **End Time**: 04:00 PM
     - **Shift Name**: "Morning Shift" (optional)
   - Click "Publish Shift"
   - ✅ Shift should appear in the list below with "Open" status

4. **Create a Second Shift**
   - **Date**: Same day (tomorrow)
   - **Start Time**: 08:00 PM
   - **End Time**: 08:00 AM (next day)
   - **Shift Name**: "Night Shift"
   - Click "Publish Shift"

5. **Create a Third Shift** (for conflict testing)
   - **Date**: Tomorrow
   - **Start Time**: 02:00 PM
   - **End Time**: 10:00 PM
   - **Shift Name**: "Afternoon Shift"
   - Click "Publish Shift"

---

### Part 2: Caregiver Views Available Shifts (FR-15)

1. **Logout from Admin**
   - Click "Logout" button

2. **Login as Caregiver (Jane)**
   - Phone: `5551234`
   - PIN: `1234`

3. **Navigate to Schedule Tab**
   - You should see two sections:
     - **My Scheduled Shifts** (currently empty - blue theme)
     - **Available Shifts** (showing all 3 shifts you created - green theme)
   - ✅ Verify all shifts show correct date, time, and name

---

### Part 3: Claim a Shift (FR-16)

1. **Claim the Morning Shift**
   - Find "Morning Shift" in Available Shifts
   - Click the green "Claim Shift" button
   - ✅ Success message should appear at top
   - ✅ Shift should move to "My Scheduled Shifts" section (blue card)
   - ✅ Shift should disappear from "Available Shifts"

2. **Verify Shift Details**
   - Check "My Scheduled Shifts" section
   - ✅ Should show "Morning Shift" 8:00 AM - 4:00 PM
   - ✅ Should display "Starts in X hours"

---

### Part 4: Test Conflict Prevention (FR-18)

1. **Try to Claim Conflicting Shift**
   - Find "Afternoon Shift" (2:00 PM - 10:00 PM)
   - Click "Claim Shift"
   - ✅ Should see ERROR message: "You have an overlapping shift at this time"
   - ✅ Shift should remain in "Available Shifts"
   - ✅ Shift should NOT appear in "My Scheduled Shifts"

2. **Claim Non-Conflicting Shift**
   - Find "Night Shift" (8:00 PM - 8:00 AM)
   - Click "Claim Shift"
   - ✅ Should succeed (no overlap with Morning Shift)
   - ✅ Shift moves to "My Scheduled Shifts"

---

### Part 5: Test Shift Dropping (FR-17)

#### Test Case A: Drop with >24 Hours Notice

1. **Drop the Morning Shift**
   - Find "Morning Shift" in "My Scheduled Shifts"
   - ✅ Should see green "Drop" button (shift is >24 hours away)
   - Click "Drop"
   - ✅ Success message appears
   - ✅ Shift moves back to "Available Shifts" (green)
   - ✅ Shift disappears from "My Scheduled Shifts"

#### Test Case B: Cannot Drop <24 Hours Before

1. **Create a Shift Starting Soon**
   - Logout and login as Admin
   - Create a shift for TODAY or TOMORROW (within 24 hours)
   - Logout and login as Caregiver Jane
   - Claim the new shift

2. **Try to Drop It**
   - Find the shift in "My Scheduled Shifts"
   - ✅ Should see "Contact Admin to cancel" instead of Drop button
   - ✅ Cannot drop the shift

---

### Part 6: Test Multi-Caregiver Scenario

1. **Logout from Jane's Account**

2. **Login as Second Caregiver (John)**
   - Phone: `5555678`
   - PIN: `5678`

3. **View Available Shifts**
   - Navigate to Schedule tab
   - ✅ Should ONLY see shifts that are "Open"
   - ✅ Should NOT see Jane's assigned shifts (privacy)

4. **Claim a Shift**
   - Claim "Afternoon Shift" (2:00 PM - 10:00 PM)
   - ✅ Should succeed
   - ✅ Appears in John's "My Scheduled Shifts"

5. **Verify Admin View**
   - Logout and login as Admin
   - Go to Schedule tab
   - ✅ Should see which caregiver is assigned to each shift:
     - Night Shift → Jane Doe
     - Afternoon Shift → John Smith
     - Morning Shift → Open (Jane dropped it)

---

## Visual Verification Checklist

### Admin Schedule View
- [ ] Can create shifts with date/time/name
- [ ] Shifts show color-coded status badges
- [ ] Can see caregiver names on assigned shifts
- [ ] "Open" shifts show as unassigned
- [ ] Can delete shifts

### Caregiver Schedule View
- [ ] Two distinct sections (My Shifts / Available)
- [ ] Blue theme for assigned shifts
- [ ] Green theme for open shifts
- [ ] Claim button on available shifts
- [ ] Drop button on assigned shifts (when >24 hrs)
- [ ] "Contact Admin" message when <24 hrs
- [ ] Hours until shift displays
- [ ] Success/error feedback messages appear

### Mobile Responsiveness
- [ ] Large touch-friendly buttons
- [ ] Readable text on small screens
- [ ] Cards stack properly on mobile
- [ ] No horizontal scrolling
- [ ] Forms work on mobile keyboards

---

## Expected Business Logic

### Conflict Detection Rules
- ✅ 8am-4pm + 2pm-10pm = **CONFLICT** (overlap)
- ✅ 8am-4pm + 8pm-8am = **NO CONFLICT** (gap between)
- ✅ 8am-4pm + 4pm-12am = **NO CONFLICT** (back-to-back is OK)

### Drop Policy
- ✅ >24 hours before = Can drop (reverts to open)
- ✅ <24 hours before = Cannot drop (contact admin)

### Privacy Rules
- ✅ Caregivers see: Open shifts + Own shifts
- ✅ Caregivers DON'T see: Other caregivers' shifts
- ✅ Admin sees: All shifts and all assignments

---

## Common Issues & Troubleshooting

### Issue: Shift doesn't appear after claiming
- **Solution**: Refresh the page or check browser console for errors

### Issue: Cannot create shift in the past
- **Solution**: Date picker has min date of today - this is intentional

### Issue: Conflict detection seems wrong
- **Solution**: Check exact times - even 1 minute overlap is detected

### Issue: Drop button not showing
- **Solution**: Verify shift is >24 hours away (check "Starts in X hours")

---

## Test Data Summary

### Users
| Name | Role | Phone | PIN | Rate |
|------|------|-------|-----|------|
| Family Admin | Admin | - | - | - |
| Jane Doe | Caregiver | 5551234 | 1234 | $25/hr |
| John Smith | Caregiver | 5555678 | 5678 | $28/hr |

### Sample Test Shifts
| Shift Name | Date | Time | Purpose |
|------------|------|------|---------|
| Morning Shift | Tomorrow | 8am-4pm | Basic claim/drop testing |
| Night Shift | Tomorrow | 8pm-8am | Non-conflict testing |
| Afternoon Shift | Tomorrow | 2pm-10pm | Conflict testing (overlaps morning) |

---

## Success Criteria

All features working if:
- ✅ Admin can publish shifts
- ✅ Caregivers can view open shifts and their shifts
- ✅ Caregivers can claim shifts with one click
- ✅ System prevents conflicting shift claims
- ✅ Caregivers can drop shifts >24 hours before
- ✅ System prevents dropping shifts <24 hours before
- ✅ UI provides clear feedback for all actions
- ✅ Multiple caregivers can work independently

---

## Next Steps After Testing

Once all tests pass:
1. ✅ Mark all FRs as complete
2. 📋 Document any bugs found
3. 🚀 Consider deployment to staging/production
4. 📊 Gather user feedback
5. 🔄 Plan next iteration of features

Happy testing! 🎉
