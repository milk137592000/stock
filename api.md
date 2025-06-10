### deepseek
model="deepseek/deepseek-r1-0528:free"
base_url="https://openrouter.ai/api/v1"
api_key ="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"

### Mistral
model="mistralai/devstral-small:free"
base_url="https://openrouter.ai/api/v1"
api_key = "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"



### Gemini
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }'
api_key = "AIzaSyAnMkrPPgmUSjmyD-2xZ6HRWEmIjQVd4vo"