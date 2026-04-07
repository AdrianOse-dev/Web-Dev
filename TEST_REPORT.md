# Test Report

## Testing Approach

The system was tested using manual test cases covering all major functionalities of the application. Testing focused on verifying correct behavior of frontend interactions, backend API responses, and database operations.

Each feature was tested individually and then as part of a complete workflow to ensure integration between components.

---

## Features Tested

The following features were tested:

- Backend health check
- User authentication (signup, login, logout)
- Channel creation and retrieval
- Post creation and viewing
- Reply creation and nested replies
- Voting system for posts and replies
- Screenshot upload and display
- Search functionality using different query types
- Admin moderation actions such as deleting posts and replies

---

## Test Results

All major functionalities of the system were tested and passed successfully.

- API endpoints returned correct responses
- Database operations were performed correctly
- UI updated dynamically based on user actions
- Authentication state was handled properly
- File uploads were successfully stored and retrieved
- Search queries returned expected results

---

## Issues Encountered

During development and testing, some issues were encountered:

- Navbar initially displayed incorrect state when user was logged in
- User state was undefined due to JSX being placed outside the component
- Docker container sometimes required rebuild to reflect changes

These issues were resolved by restructuring components correctly and ensuring proper state handling.

---

## Conclusion

The system was thoroughly tested using manual test cases and is functioning as expected. All required features have been implemented and verified successfully.
