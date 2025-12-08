# Testing Guide: Update & Delete Features

## Quick Test Scenarios

### Test 1: Edit a Scheduled Shift

**Objective**: Verify shift editing works correctly

**Steps**:
1. Login as Admin (`admin@example.com` / `password123`)
2. Navigate to "Schedule" tab
3. Create a test shift:
   - Date: Tomorrow
   - Start: 9:00 AM
   - End: 5:00 PM
   - Name: "Test Shift"
   - Click "Publish"
4. Click "Edit" button on the newly created shift
5. Verify form populates with existing data
6. Change the shift:
   - Start: 8:00 AM
   - End: 4:00 PM
   - Name: "Updated Test Shift"
7. Click "Update"

**Expected Results**:
✅ Form title changes to "Edit Shift"  
✅ Existing data appears in form fields  
✅ "Update" and "Cancel" buttons appear  
✅ Changes save successfully  
✅ Shift card shows updated information  
✅ Success is immediate (no page refresh needed)  

**Edge Cases to Test**:
- Click "Cancel" - changes should be discarded
- Edit and refresh page - changes should persist
- Edit an assigned shift - should work the same way

---

### Test 2: Delete a Scheduled Shift

**Objective**: Verify shift deletion works with confirmation

**Steps**:
1. Login as Admin
2. Navigate to "Schedule" tab
3. Create a test shift (any date/time)
4. Click "Delete" button on the shift
5. In confirmation dialog, click "OK"

**Expected Results**:
✅ Confirmation dialog appears  
✅ Dialog message: "Are you sure you want to delete this shift?"  
✅ Shift disappears from list after confirmation  
✅ Deletion persists after page refresh  

**Edge Cases to Test**:
- Click "Cancel" in dialog - shift should remain
- Delete an assigned shift - should still work
- Delete multiple shifts in succession

---

### Test 3: Update Caregiver Hourly Rate

**Objective**: Verify inline rate editing works

**Steps**:
1. Login as Admin
2. Navigate to "Caregivers" tab
3. Find "Jane Doe" (currently $25.00/hr)
4. Click "Edit" next to her rate
5. Verify inline input appears with current rate
6. Change rate to `30.50`
7. Click "Save"

**Expected Results**:
✅ Input field appears with current value  
✅ "Save" and "Cancel" buttons appear  
✅ Can enter decimal values  
✅ Rate updates to $30.50/hr  
✅ Change persists after refresh  
✅ Future shifts will use new rate  

**Edge Cases to Test**:
- Click "Cancel" - rate should not change
- Enter invalid value (letters) - should not save
- Update multiple caregivers in sequence
- Verify old shifts keep old rate

---

### Test 4: Toggle Caregiver Status

**Objective**: Verify active/inactive toggle works

**Steps**:
1. Login as Admin
2. Navigate to "Caregivers" tab
3. Find "Jane Doe" (should be Active - green badge)
4. Click the green "Active" badge
5. Logout from admin
6. Try to login as Jane (`5551234` / `1234`)

**Expected Results**:
✅ Badge changes from green "Active" to red "Inactive"  
✅ Status changes immediately  
✅ Jane cannot log in (account deactivated)  
✅ Change persists after refresh  

**To Reactivate**:
1. Login as Admin
2. Click red "Inactive" badge
3. Badge changes back to green "Active"
4. Jane can now log in again

**Edge Cases to Test**:
- Toggle multiple times rapidly
- Refresh page while inactive
- Inactive caregiver's shifts still visible in history

---

### Test 5: Delete Caregiver

**Objective**: Verify caregiver deletion with proper warnings

**Steps**:
1. Login as Admin
2. Navigate to "Caregivers" tab
3. Create a new test caregiver:
   - Name: "Test Caregiver"
   - Phone: "9999999"
   - PIN: "9999"
   - Rate: 20.00
4. Click "Delete" on the test caregiver
5. Read confirmation dialog carefully
6. Click "OK"

**Expected Results**:
✅ Confirmation dialog appears  
✅ Warning message: "This action cannot be undone"  
✅ Caregiver removed from table  
✅ Deletion persists after refresh  

**Safety Tests**:
- Click "Cancel" - caregiver should remain
- Delete admin user - should work (be careful!)
- Caregiver with shifts - shifts remain but show "Unknown"

---

### Test 6: Complete CRUD Workflow

**Objective**: Test full lifecycle of shift management

**Steps**:

**CREATE**:
1. Login as Admin → Schedule tab
2. Create shift: Tomorrow, 9am-5pm, "Morning Shift"
3. ✅ Shift appears in list

**READ**:
4. Verify shift displays correctly with all details
5. ✅ Date, time, name all visible

**UPDATE**:
6. Click "Edit" on the shift
7. Change name to "Updated Morning Shift"
8. Change time to 8am-4pm
9. Click "Update"
10. ✅ Changes appear immediately

**DELETE**:
11. Click "Delete" on the shift
12. Confirm deletion
13. ✅ Shift removed from list

---

### Test 7: Multi-User Impact

**Objective**: Verify updates reflect for caregivers

**Setup**: Create and assign a shift

**Steps**:
1. Login as Admin
2. Create shift: Tomorrow, 2pm-10pm, "Afternoon Shift"
3. Logout, login as Jane Doe
4. Navigate to Schedule tab
5. Claim the "Afternoon Shift"
6. Logout, login as Admin
7. Edit the shift time to 3pm-11pm
8. Logout, login as Jane Doe
9. Check "My Scheduled Shifts"

**Expected Results**:
✅ Jane sees updated time (3pm-11pm)  
✅ Changes reflect immediately  
✅ No data corruption  

---

## Visual Verification Checklist

### Schedule Tab
- [ ] "Publish Open Shift" form exists
- [ ] "Edit Shift" title appears when editing
- [ ] Form populates with shift data during edit
- [ ] "Update" button appears during edit
- [ ] "Cancel" button appears during edit
- [ ] "Edit" button on each shift card
- [ ] "Delete" button on each shift card
- [ ] Confirmation dialog for deletions

### Caregivers Tab
- [ ] "Manage Caregivers" section title
- [ ] "Actions" column in table
- [ ] "Edit" link next to rates
- [ ] Inline input field during rate edit
- [ ] "Save" and "Cancel" buttons during edit
- [ ] Clickable status badges
- [ ] "Delete" button in Actions column
- [ ] Confirmation dialog for deletions

---

## Error Handling Tests

### Invalid Inputs
- [ ] Rate edit with negative number - should prevent
- [ ] Rate edit with letters - should not save
- [ ] Shift edit with past date - (currently allows, consider if this is desired)
- [ ] Empty shift name - should allow (optional field)

### Network Simulation
- [ ] All changes persist after browser refresh
- [ ] Multiple tabs open - changes sync (requires manual refresh)
- [ ] Clear localStorage - app resets to defaults

---

## Performance Tests

- [ ] Edit 10 shifts rapidly - no lag
- [ ] Delete 10 shifts rapidly - no errors
- [ ] Update multiple caregiver rates - smooth UI
- [ ] Large dataset (50+ shifts) - still responsive

---

## Accessibility Tests

- [ ] All buttons keyboard accessible (Tab key)
- [ ] Can edit/save/cancel using keyboard only
- [ ] Confirmation dialogs accessible
- [ ] Screen reader friendly (buttons have clear labels)

---

## Mobile Responsiveness

- [ ] Edit buttons visible on mobile
- [ ] Delete buttons accessible on small screens
- [ ] Inline edit inputs usable on mobile keyboards
- [ ] Confirmation dialogs work on mobile
- [ ] No horizontal scrolling

---

## Data Integrity Tests

### Caregiver Rate Updates
1. Create shift with Jane at $25/hr
2. Update Jane's rate to $30/hr
3. Create new shift with Jane
4. Verify:
   - Old shift shows $25/hr
   - New shift shows $30/hr
   - ✅ Historical data preserved

### Shift Assignment Preservation
1. Create open shift
2. Caregiver claims shift
3. Admin edits shift time
4. Verify:
   - Shift still assigned to caregiver
   - Caregiver sees updated time
   - ✅ Assignment not lost

---

## Common Issues & Solutions

### Issue: Edit button doesn't show inline input
**Solution**: Check console for errors, refresh page

### Issue: Changes don't persist after refresh
**Solution**: Verify LocalStorage is enabled in browser settings

### Issue: Confirmation dialog not appearing
**Solution**: Check if browser is blocking popups/dialogs

### Issue: Cannot edit multiple items at once
**Solution**: This is by design - finish editing current item first

---

## Regression Testing

Verify existing features still work:
- [ ] Caregiver can still claim shifts
- [ ] Caregiver can still drop shifts
- [ ] Admin can still create new shifts
- [ ] Time clock still functions
- [ ] Login/logout still works
- [ ] Conflict prevention still works

---

## Success Criteria

All features working correctly if:
✅ Can edit scheduled shifts (date, time, name)  
✅ Can delete scheduled shifts with confirmation  
✅ Can update caregiver hourly rates inline  
✅ Can toggle caregiver active/inactive status  
✅ Can delete caregivers with confirmation  
✅ All changes persist after browser refresh  
✅ UI provides clear feedback for all actions  
✅ Confirmation dialogs prevent accidental deletions  
✅ No errors in browser console  
✅ Mobile-friendly interface  

---

## Production Readiness Checklist

Before deploying to users:
- [ ] All tests above passed
- [ ] No console errors during testing
- [ ] Performance is acceptable
- [ ] Mobile devices tested
- [ ] Admin trained on new features
- [ ] Documentation updated
- [ ] Backup/restore plan in place (for LocalStorage)

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. 📋 Document any bugs found
3. 🚀 Deploy to production
4. 📊 Gather user feedback
5. 🔄 Plan next iteration

Happy testing! 🎉
