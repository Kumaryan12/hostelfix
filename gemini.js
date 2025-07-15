export async function getComplaintSeverity(desc) {
  const prompt = `Based on the following complaint description, classify the severity into Low, Moderate, or High.

Complaint: "${desc}"

Only return one word: Low, Moderate, or High.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await res.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (['Low', 'Moderate', 'High'].includes(responseText)) {
      return responseText;
    } else {
      console.warn('Unexpected Gemini response:', responseText);
      return 'Moderate'; // fallback
    }

  } catch (error) {
    console.error('Gemini fetch failed:', error);
    return 'Moderate'; // fallback on error
  }
}
