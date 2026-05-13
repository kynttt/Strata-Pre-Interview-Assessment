# Process Flow — Strata Enquiry Processor

This document walks through the complete user journey, from opening the app to sending an AI-generated response back to a client.

---

## Step 1: Open the App

Navigate to the deployed app:

**[https://strata-pre-interview-assessment.vercel.app/](https://strata-pre-interview-assessment.vercel.app/)**

You will land on the **Dashboard** (`/`). If you have not configured an AI provider yet, a banner at the top prompts you to do so.

---

## Step 2: Configure the AI Provider

1. Click **Configure AI** in the top navigation bar.
2. Choose a provider:
   - **OpenAI** — requires an API key
   - **Anthropic** — requires an API key
   - **Google Gemini** — requires an API key
   - **Ollama** — runs locally, no key needed
3. Enter your API key.
4. Click **Fetch Models** to see available models for your account.
5. Select a model:
   - Free tier: `gemini-1.5-flash-latest` (Google) or `gpt-4o` (OpenAI with trial credits)
6. Click **Save Configuration**.

Your settings are stored in the browser's `localStorage` and persist across sessions.

---

## Step 3: Navigate to Enquiries

Click **Enquiries** in the top navigation. This page has two tabs:

- **Chats** — Messenger-style conversation threads with sample client messages.
- **Emails** — Gmail-style inbox with sample email enquiries.

---

## Step 4: Process an Enquiry

### Chats Tab

1. Select a conversation from the left sidebar.
2. In the chat panel, click the **Process** button in the toolbar.
3. The app sends the client's last message to the AI pipeline.

### Emails Tab

1. Select one or more email rows by clicking their checkboxes.
2. Click **Process Selected** in the toolbar.
3. The app enqueues the items and begins processing.

---

## Step 5: AI Classification & Routing (Automatic)

When you click **Process**, the app runs two skills in sequence:

### Skill 1: classify-enquiry

The AI analyses the client's message and returns:

```json
{
  "type": "new_client",
  "confidence": 0.94,
  "reasoning": "The user explicitly asks about booking a consultation."
}
```

**Categories:** `new_client`, `support_request`, `complaint`, `general_question`, `needs_clarification`

### Skill 2: route-enquiry

Based on the classification, the AI assigns a team and priority:

```json
{
  "team": "Sales",
  "priority": "medium"
}
```

**Teams:** Sales, Technical Support, Complaints, General

**Priorities:** low, medium, high

### Confidence Check

- If confidence is **>= 0.7** → routing proceeds normally.
- If confidence is **< 0.7** or type is `needs_clarification` → flagged for **human review** and response generation is skipped.

---

## Step 6: View the Routed Enquiry

Go back to the **Dashboard** (`/`). The enquiry now appears in the appropriate team tab (e.g., **Sales**).

Click the row to open the detail card. You will see:

- Classification badge (e.g., "new client")
- Confidence bar with percentage
- Assigned team and priority
- Status badge ("Needs Review" or "Completed")

---

## Step 7: Generate a Response

In the detail card, click **Generate Response**.

The app calls the third skill:

### Skill 3: generate-response

The AI drafts a professional reply based on the enquiry and classification:

```json
{
  "draft": "Dear Sarah, thank you for your interest in our strata management services...",
  "recommended_action": "Follow up within 24 hours with a detailed quote."
}
```

The draft appears in the card within a few seconds. If an error occurs (e.g., invalid API key, model not found, timeout), a red error banner is shown.

---

## Step 8: Edit the Draft (Optional)

Before sending, you can edit the response:

1. Click the **Edit** button.
2. Modify the text in the textarea.
3. Click **Done Editing** to save.

Edits persist in `localStorage` and survive page refreshes.

---

## Step 9: Send the Response

Click **Send Response**.

What happens:

1. The response is marked as **sent** on the dashboard row ("Responded" badge).
2. The response is saved to `localStorage`.
3. If the enquiry originated from the **Chats** tab, the response is also appended to that conversation thread, so you can see the full back-and-forth.

---

## Step 10: Verify the Conversation Thread

Go back to **Enquiries** → **Chats** tab.

If you sent the response from a conversation that was processed here, you will see the team reply at the bottom of the chat thread.

---

## Summary Flow

```
User opens app
    |
    v
Configure AI provider + model
    |
    v
Go to Enquiries → select enquiry
    |
    v
Click Process
    |
    v
[AI] classify-enquiry → type + confidence
[AI] route-enquiry → team + priority
    |
    v
Dashboard → enquiry appears in team tab
    |
    v
Click row → Generate Response
    |
    v
[AI] generate-response → draft + recommended action
    |
    v
(Optional) Edit draft
    |
    v
Click Send Response
    |
    v
Response saved + shown in Chats thread
```

---

## Error Handling at Each Step

| Step | Possible Error | What You See |
|---|---|---|
| Configure AI | Invalid API key | "Authentication failed" banner |
| Fetch Models | Wrong model name | "Model not available" with suggestion |
| Process | Network issue | Red "Processing Error" banner |
| Process | No AI config | Yellow "Configuration Required" banner |
| Generate Response | Timeout | "Request timed out" message in card |
| Generate Response | Provider error | "Provider unavailable" message in card |

---

## Tips for Testing

- Use **Google Gemini** with `gemini-1.5-flash-latest` for a free, fast experience.
- If a model fails with a 404, go to **Configure AI** and click **Fetch Models** to get the exact model ID supported by your account.
- Process enquiries one at a time for the most reliable experience. Batch processing works locally but may be unreliable on Vercel's serverless functions.
- All data lives in `localStorage`. Clearing your browser data will reset the app to its initial state.
