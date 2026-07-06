# v0.1.0 — Memory

AI 開始真正認識使用者。這個版本沒有新頁面、沒有改版面風格、沒有新動畫、
沒有新設定，所有時間都花在「記憶」這件事的資料與邏輯上。全部資料仍然只
存在同一個 localStorage blob 裡（`alongside_state_v1` 這把 key 沒變），
從 v1 結構自動 migrate 成 v2，不會清掉使用者原本的 Journey／個人資料。

## 1. Memory Engine（最高優先）
新增 `memory.entries`：每一筆記憶都有

- `content`（內容）
- `confidence`（信心值，0–100）
- `lastUpdate`（最後更新時間）
- `source`（`discussion` / `journey_pattern`）
- `status`（`active` / `archived`）

分類對應你列的六種：生活習慣、工作型態、偏好、不喜歡、最近狀態、長期變化
（`MEMORY_CATEGORIES`），各自有自己的衰退速率設定。

## 2. About You 自動更新
Discussion 裡如果直接說出關於自己的事實（例如「我最近很常加班」「我討厭
香菜」「我每天都十一點睡」），會立刻寫進 Memory，同時直接更新 About You
對應的欄位（工作型態／不喜歡的食物／睡眠偏好）——不用使用者自己再去設定
頁打字，欄位本身還是原本的 EditableRow，AI 填的內容一樣可以手動修改。

## 3. 先詢問，再永久記住
凡是 AI 自己「推論」出來、而不是使用者直接說出口的判斷（目前規則：從
Journey 完成紀錄中偵測到高頻率但主觀的偏好，例如奶茶／咖啡／散步），一律
不會直接寫入，而是先在 Discussion 出現一張確認卡：

> 💡 我發現：你好像很喜歡奶茶。要不要讓我記住？
> 〔記住〕〔不用〕

按「記住」才會真的變成 Memory；按「不用」會記下這個推論被拒絕過，之後
不會馬上重複問同一件事，也不會硬套資料。

## 4. Memory Timeline
About You 頁面新增「最近更新」，列出最近的新增／更新／移除／封存紀錄
（`memory.timeline`，最多保留 40 筆），完全由 AI 自己在背景維護，不需要
使用者手動操作。

## 5. Observation ↔ Memory
「推論」在被確認前，本質上就是一個 Observation（暫時、待驗證），只有
使用者按下「記住」才會升級成正式 Memory；使用者也可以在 About You 直接
把任何一筆 Memory「忘記」（封存），等於把它退回未確認狀態。

## 6. Memory 會衰退
生活習慣／工作型態／最近狀態／長期變化這幾類會隨時間衰退信心值
（`getEffectiveConfidence`，依類別有不同衰退速率，例如「最近狀態」衰退
最快、「長期變化」最慢）；低於門檻（15%）會在下次開啟 App 時自動封存進
Timeline，不會無限期占著一筆過期的「事實」。偏好／不喜歡兩類預設不衰退
——不喜歡香菜這種事通常不會因為沒提起就失效。

## 7. Relationship（內部使用，不顯示在畫面上）
新增 `relationship`：對話次數、首次／最近互動時間、記憶被接受／拒絕的
次數。`computeRelationshipSummary()` 可以算出聊天頻率、接受建議比例、
一個簡單的信任分數，目前純粹是資料基礎，還沒有拿來改變 AI 的說話方式
——這部分老實說目前只是打底，等之後真的要用時不需要重新設計資料結構。

## 8. About You（原 My Life）
分頁名稱從「My Life」改成「About You」（頁內標題「關於你」），因為這裡
現在放的是 AI 整理過的東西，不是設定頁。原本的個人資訊等設定內容維持
不動，只是被放在更準確的名字底下。

## 9. 隱私分層（資料結構先行，尚未做加密）
狀態物件在概念上分成四層，並在程式碼開頭寫清楚對應關係，方便之後真的要
做端對端加密時，不用重新設計資料模型：

- `chatLayer` → discussion（原始對話）
- `memoryLayer` → memory, relationship（AI 整理過的知識）
- `lifeLayer` → todayJourney, tomorrowJourney, goals, history
- `profileLayer` → profile, aiPersonality, notifications, healthSync, theme

新增 `encryption: { enabled: false }` 作為保留欄位。老實說：這次沒有把
整個物件實際巢狀重寫成四層（那會動到全部畫面的每一處讀取，風險大於現在
的效益），而是先用清楚的分類註解＋獨立的頂層欄位命名把邊界畫出來。等真
的要接加密時，這個分類就是重構的地圖，不用重新盤點一次資料在哪裡。

## 這次沒做、也刻意沒做的事
- 沒有新增頁面
- 沒有改版面或視覺風格（Memory／Timeline 用的是既有的 Card／Row／按鈕樣式）
- 沒有新增動畫語彙（沿用既有的 SPRING／SPRING_SOFT／bobIn）
- 沒有新增設定項目
- 沒有做真正的端對端加密（明確保留給未來）
- Relationship 資料先打底，還沒有真的拿去改變 AI 的語氣或行為
