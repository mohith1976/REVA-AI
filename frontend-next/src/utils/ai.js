const LANGUAGE_MAP = {
    en: 'English',
    hi: 'Hindi',
    ta: 'Tamil',
    te: 'Telugu',
    kn: 'Kannada',
    mr: 'Marathi',
    bn: 'Bengali',
    gu: 'Gujarati',
    ml: 'Malayalam',
    pa: 'Punjabi',
};

const FALLBACK_MESSAGES = {
    en: (text) => `Thinking disabled (API Error). You said: "${text}"`,
    hi: (text) => `संपर्क टूटना (API Error). आपने कहा: "${text}"`,
    ta: (text) => `சிந்தனை முடக்கப்பட்டுள்ளது (API Error). நீங்கள் சொன்னது: "${text}"`,
    te: (text) => `ఆలోచన నిలిపివేయబడింది (API Error). మీరు చెప్పింది: "${text}"`,
    kn: (text) => `ಚಿಂತನೆ ನಿಷ್ಕ್ರಿಯಗೊಂಡಿದೆ (API Error). ನೀವು ಹೇಳಿದ್ದು: "${text}"`,
    mr: (text) => `विचार करणे अक्षम केले आहे (API Error). आपण म्हणालात: "${text}"`,
    bn: (text) => `চিন্তা করা অক্ষম করা হয়েছে (API Error). আপনি বলেছেন: "${text}"`,
    gu: (text) => `વિચારણા અક્ષમ છે (API Error). તમે કહ્યું: "${text}"`,
    ml: (text) => `ചിന്ത അപ്രാപ്തമാക്കി (API Error). നിങ്ങൾ പറഞ്ഞു: "${text}"`,
    pa: (text) => `ਸੋਚਣਾ ਅਸਮਰੱਥ ਹੈ (API Error). ਤੁਸੀਂ ਕਿਹਾ: "${text}"`,
};

export const getAIResponse = async (text, languageCode, context = {}) => {
    const languageName = LANGUAGE_MAP[languageCode] || languageCode;
    const fallbackFn = FALLBACK_MESSAGES[languageCode] || FALLBACK_MESSAGES['en'];

    const azureEndpoint = process.env.NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT;
    const azureApiKey = process.env.NEXT_PUBLIC_AZURE_OPENAI_KEY;
    const deploymentName = process.env.NEXT_PUBLIC_AZURE_OPENAI_DEPLOYMENT || 'sih-vision';

    if (!azureEndpoint || !azureApiKey) {
        console.error('Azure OpenAI credentials missing');
        return fallbackFn(text).replace('(API Error)', '(Missing Credentials)');
    }

    let url = azureEndpoint;
    if (!url.includes('/openai/deployments')) {
        url = `${azureEndpoint.replace(/\/$/, '')}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;
    }

    let contextStr = 'You are REVA, a compassionate AI Police Assistant for India.';
    if (context.userName) contextStr += ` You are speaking to ${context.userName}.`;
    if (context.location) contextStr += ` The user is currently in ${context.location}.`;
    if (context.mobile) contextStr += ` Their verified mobile is ${context.mobile}.`;
    if (context.userFathersName) contextStr += ` Father's/Husband's name: ${context.userFathersName}.`;
    if (context.userOccupation) contextStr += ` Occupation: ${context.userOccupation}.`;
    if (context.userAddress) contextStr += ` Residential address: ${context.userAddress}.`;

    if (context.userCategory === 'child') {
        contextStr += `\n\n--- AGE PROFILE: CHILD (Age: ${context.userAge}) ---\nThis user is a child. You MUST:\n- Use very simple, short sentences and easy words a child can understand.\n- Be warm, gentle, and highly reassuring at all times.\n- Avoid legal jargon or complex terminology entirely.\n- Use encouraging phrases like "You are doing great", "Don't worry, I am here to help you".\n- Prioritize emotional safety — make the child feel calm and protected.\n- Ask one simple question at a time and wait patiently.\n--- END AGE PROFILE ---`;
    } else if (context.userCategory === 'senior') {
        contextStr += `\n\n--- AGE PROFILE: SENIOR CITIZEN (Age: ${context.userAge}) ---\nThis user is a senior citizen. You MUST:\n- Speak respectfully, calmly, and patiently at all times.\n- Use clear, simple language — avoid abbreviations and technical terms.\n- Provide step-by-step guidance, one step at a time.\n- Repeat or rephrase important instructions when needed.\n- Use phrases like "Please take your time", "You are doing very well".\n- Be extra patient and never rush the conversation.\n--- END AGE PROFILE ---`;
    } else if (context.userCategory === 'adult') {
        contextStr += `\n\n--- AGE PROFILE: ADULT (Age: ${context.userAge}) ---\nThis user is an adult. You MUST:\n- Maintain a structured, professional, and efficient tone.\n- Be clear, concise, and factual.\n- Ask follow-up questions confidently to gather all required details quickly.\n- Use proper legal/police terminology where appropriate.\n--- END AGE PROFILE ---`;
    }

    contextStr += ` You MUST reply ONLY in ${languageName}. Keep responses short, concise, and natural for voice synthesis. 
  Ask follow up questions one by one to gather complaint details: 1. Incident Type, 2. Location, 3. Description, 4. Date/Time.
  
  --- CYBER SECURITY PROTOCOL ---
  If the user's complaint relates to cybercrime (e.g., Financial Fraud, Phishing, Hacking, Cyber Bullying, or Identity Theft):
  1. Immediately classify the incident as a Cybercrime.
  2. Advise the user to call 1930 (National Cyber Crime Helpline) for financial fraud.
  3. Provide a 'Cyber Security Tip' relevant to their issue.
  4. Ensure these steps are integrated naturally into your empathetic conversation.
  --- END PROTOCOL ---

  When you have gathered ALL the details, you must conclude by saying something like "Thank you, I am now filing your complaint." and you MUST append a JSON block at the very end like this:
  [[SUBMIT: {"incidentType": "...", "location": "...", "description": "...", "dateTime": "..."}]]`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': azureApiKey,
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: contextStr },
                    ...(context.history || []),
                    { role: 'user', content: text },
                ],
                max_tokens: 400,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API Error');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('AI Error:', error);
        return fallbackFn(text);
    }
};
