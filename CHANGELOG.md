# v0.1.1 — Chat Intelligence & Memory Classification

提升 Discussion 對自由對話的理解能力。這次沒有動 Memory Engine、
Confidence、Timeline、Observation、Relationship 的資料結構——只重構「訊息
進來之後，AI 怎麼決定要做什麼」這條流程。舊版本檔案（v0.1.0 及之前）都
沒有被覆蓋，全部保留在各自的版本檔名底下。

## 一、Memory Classifier
新增 `classifyMessage(text, state)`，每一則「自由輸入」的訊息（不是預設
的快速回覆按鈕）送出後，會先分類成四種意圖之一，再決定要怎麼處理：

| 意圖 | 判斷方式 | 處理 |
|---|---|---|
| `modify` | 出現「其實／後來／改成」等修正語氣，且新值與現有資料不同 | 直接更新 + 顯示卡片 |
| `info` | 符合任一直接事實規則 | 直接更新 + 顯示卡片 |
| `question` | 以「？」結尾或「為什麼／怎麼／要不要」開頭 | 只回覆，不更新 |
| `chitchat` | 以上皆非 | 只回覆，不更新 |

重要：快速回覆按鈕（milktea／電腦房那組導引式對話）完全走原本的腳本
（`advanceScripted`），分類器只作用在使用者自己打字的內容
（`advanceFreeText`），兩者互不干擾。

## 二、擴充 My Life 自動分類規則
`detectDirectStatement()` 從原本 3 條規則擴充到涵蓋你列的完整對照表：

- 姓名／暱稱 → 個人資訊
- 生日 → 個人資訊
- 睡眠時間 → 生活偏好（睡眠偏好）
- 工作型態／加班／很忙／在職產業 → 工作型態
- 不喜歡吃 X → 生活偏好（不喜歡的食物）
- 每天喝／吃 X（習慣） → 生活偏好（飲食偏好）
- 固定吃魚油／維他命／B群等 → 生活偏好（保健食品）
- 固定服藥 → 生活偏好（固定藥物）
- 正在減肥／瘦身／戒⋯ → 記錄為 Memory（最近狀態），沒有對應欄位可寫就不
  勉強塞一個，只留在 Memory 裡

新增 `PROFILE_FIELD_META`，讓每個欄位知道自己屬於 About You 的哪個分區
（個人資訊／工作型態／生活偏好），這是 Memory Update Card 顯示位置的依據。

## 三、直接事實立即更新，不再每次都問
`info` 與 `modify` 兩種意圖都會立刻寫入（`applyDirectStatement`），完全
不會跳出「要不要記住？」。回覆也改成自然的一句話（「好，我記下來了。」／
修正時是「好，幫你更新一下。」），不會機械式重複同一句話。

## 四、推測型內容維持原本的確認機制
AI 自己從行為模式推論出來的東西（`detectInferredCandidate`，例如從
Journey 完成紀錄看出高頻率的奶茶／咖啡／散步）完全沒有改動，一樣只會先
跳出 💡 確認卡片，使用者按「記住」才會真的存。這次刻意沒有讓分類器去做
「從聊天內容猜測」這件事——用力猜測使用者話裡沒直接講的事，风险比效益大，
維持只從真實行為模式做推論這個原則。

## 五、新增 Memory Update Card
只要一則訊息成功更新了 About You 的某個欄位，聊天室就會多一張卡片：

```
✓ 已更新 About You
生活偏好
• 不喜歡的食物：不喜歡香菜
```

不再只有一句「好，我記住了」——卡片會準確告訴使用者「更新了哪一區、哪個
欄位、變成什麼值」。`discussion.messages` 的訊息物件多了一個可選的
`type: "card"` 欄位（連同 `section`/`label`/`value`）；沒有這個欄位的舊
訊息一樣以純文字泡泡呈現，完全向下相容。

## 六、沒有動到的部分
Memory Engine（`memory.entries` 形狀）、Confidence／衰退邏輯
（`getEffectiveConfidence`／`runMemoryDecay`）、Timeline
（`memory.timeline`）、Observation↔Memory（`pendingConfirmation` 機制）、
Relationship（`relationship` 物件與 `computeRelationshipSummary`）全部
維持 v0.1.0 的資料結構與行為，一個欄位都沒有改。
