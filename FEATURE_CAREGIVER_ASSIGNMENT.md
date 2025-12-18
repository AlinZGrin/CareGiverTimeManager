# Feature: Assign Caregiver to Shifts When Scheduling

## Overview

Admins can now assign shifts directly to caregivers when creating or editing scheduled shifts in the "Publish Open Shift" form. This streamlines the workflow by allowing immediate assignment instead of requiring caregivers to claim open shifts.

## What Changed

### Previous Behavior
- All shifts created through the Schedule tab were created as "open" shifts (status: 'open', caregiverId: null)
- Caregivers had to manually claim these open shifts
- No way to directly assign a shift to a caregiver from the admin panel

### New Behavior
- Added an optional "Assign to Caregiver" dropdown in the shift scheduling form
- Admins can select a caregiver when creating a new shift
- Admins can change the assigned caregiver when editing an existing shift
- If no caregiver is selected, the shift remains open for caregivers to claim
- Shift status automatically changes to 'assigned' when a caregiver is selected
- Only active caregivers appear in the dropdown

## User Interface Changes

### Schedule Tab - Publish Open Shift Form

The form now includes a new field:

**Assign to Caregiver (optional)**
- Dropdown selector showing all active caregivers
- Default option: "Leave Open (Unassigned)"
- Appears below the "Shift Name" field
- Works for both creating new shifts and editing existing shifts

![Shift Form with Caregiver Assignment](https://github.com/user-attachments/assets/a55ca4f5-a8dd-4da8-8098-2c25a87a39e5)

## Technical Implementation

### Modified Files
- `src/app/admin/page.tsx`

### Changes Made

1. **handleCreateScheduledShift function**
   - Added `caregiverId` extraction from form data
   - Set `caregiverId` in new shift (null if empty)
   - Set `status` to 'assigned' if caregiver is selected, 'open' otherwise

2. **handleUpdateScheduledShift function**
   - Added `caregiverId` extraction from form data
   - Added `caregiverId` and `status` to the update payload
   - Set `status` to 'assigned' if caregiver is selected, 'open' otherwise

3. **Form UI**
   - Added new caregiver selection dropdown
   - Populated with active caregivers from the `caregivers` state
   - Uses `defaultValue` to show current assignment when editing
   - Fully responsive (mobile-friendly)

## Usage Instructions

### To Create a Shift with Assignment
1. Navigate to Admin Dashboard → Schedule tab
2. Fill in the shift details (dates, times, optional name)
3. Select a caregiver from the "Assign to Caregiver" dropdown
4. Click "Publish"
5. The shift will be created with status 'assigned' and assigned to the selected caregiver

### To Create an Open Shift
1. Navigate to Admin Dashboard → Schedule tab
2. Fill in the shift details (dates, times, optional name)
3. Leave "Assign to Caregiver" set to "Leave Open (Unassigned)"
4. Click "Publish"
5. The shift will be created with status 'open' and available for caregivers to claim

### To Change Shift Assignment
1. Navigate to Admin Dashboard → Schedule tab
2. Click "Edit" on any shift in the list or calendar
3. Change the "Assign to Caregiver" dropdown selection
4. Click "Update"
5. The shift assignment will be updated accordingly

## Benefits

1. **Faster Workflow**: Admins can assign shifts immediately without waiting for caregivers to claim them
2. **Better Control**: Direct assignment ensures important shifts are covered by specific caregivers
3. **Flexibility**: Still supports open shifts for caregiver self-selection
4. **Simplified Management**: One form handles both open and assigned shifts

## Backward Compatibility

- All existing shifts remain unchanged
- The feature is fully optional - shifts can still be created as open
- No breaking changes to data structure
- Compatible with existing shift claiming functionality

## Testing Recommendations

1. Create a new shift without selecting a caregiver (verify it's open)
2. Create a new shift with a caregiver selected (verify it's assigned)
3. Edit an open shift and assign a caregiver (verify status changes to assigned)
4. Edit an assigned shift and change to "Leave Open" (verify status changes to open)
5. Verify only active caregivers appear in the dropdown
6. Test on both desktop and mobile devices
