---

#  `TESTS.md`

```md
# Manual Test Cases

## Test 1 - Health Check
**Action:** Open `http://localhost:8080/health`  
**Expected Result:** Server responds with status message  
**Actual Result:** Passed  

---

## Test 2 - View Channels

**Action:** Open channels page  
**Expected Result:** All channels displayed  
**Actual Result:** Passed

---

## Test 3 - Create Channel

**Action:** Create new channel  
**Expected Result:** Channel appears in list  
**Actual Result:** Passed

---

## Test 4 - View Channel Posts

**Action:** Click a channel  
**Expected Result:** Posts for that channel displayed  
**Actual Result:** Passed

---

## Test 5 - Create Post

**Action:** Submit a post  
**Expected Result:** Post appears in channel  
**Actual Result:** Passed

---

## Test 6 - View Single Post

**Action:** Click a post  
**Expected Result:** Post page loads  
**Actual Result:** Passed

---

## Test 7 - Create Reply

**Action:** Add reply to post  
**Expected Result:** Reply appears  
**Actual Result:** Passed

---

## Test 8 - Nested Reply

**Action:** Reply to a reply  
**Expected Result:** Nested reply appears  
**Actual Result:** Passed

---

## Test 9 - Vote on Post

**Action:** Upvote/downvote post  
**Expected Result:** Score updates  
**Actual Result:** Passed

---

## Test 10 - Vote on Reply

**Action:** Vote on reply  
**Expected Result:** Score updates  
**Actual Result:** Passed

---

## Test 11 - Upload Image (Post)

**Action:** Upload screenshot to post  
**Expected Result:** Image displays  
**Actual Result:** Passed

---

## Test 12 - Upload Image (Reply)

**Action:** Upload screenshot to reply  
**Expected Result:** Image displays  
**Actual Result:** Passed

---

## Test 13 - Search by Text

**Action:** Search using keyword  
**Expected Result:** Relevant results returned  
**Actual Result:** Passed

---

## Test 14 - Search by Author

**Action:** Search by author ID  
**Expected Result:** Author content returned  
**Actual Result:** Passed

---

## Test 15 - Search Highest Ranked

**Action:** Search highest-ranked  
**Expected Result:** Sorted results  
**Actual Result:** Passed

---

## Test 16 - Admin Access

**Action:** Open admin page  
**Expected Result:** Admin verified  
**Actual Result:** Passed

---

## Test 17 - Admin Delete Post

**Action:** Delete post  
**Expected Result:** Post removed  
**Actual Result:** Passed

---

## Test 18 - Sign Out

**Action:** Click sign out  
**Expected Result:** User logged out and navbar updates  
**Actual Result:** Passed
