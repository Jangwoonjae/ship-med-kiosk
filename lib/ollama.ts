const OLLAMA_HOST  = process.env.OLLAMA_HOST  ?? 'localhost';
const OLLAMA_PORT  = process.env.OLLAMA_PORT  ?? '11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma3:12b';
const OLLAMA_URL   = `http://${OLLAMA_HOST}:${OLLAMA_PORT}/api/generate`;

export async function matchIngredient(
  context: string,           // "품명: 모드코프정\n식약처 성분: 아세트아미노펜+클로르페니라민"
  ingredientList: string[]
): Promise<string | null> {
  if (!context || ingredientList.length === 0) return null;

  const prompt = `당신은 의약품 전문가입니다.
아래 의약품 정보를 보고 성분명 목록 중 주성분과 가장 일치하는 것 하나만 답하세요.
목록에 없으면 "없음"이라고만 답하세요.
반드시 목록에 있는 성분명 그대로만 답하고 다른 설명은 하지 마세요.

의약품 정보:
${context}

성분명 목록:
${ingredientList.join('\n')}

답:`;

  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 30,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const answer = data.response?.trim() ?? '';

    const matched = ingredientList.find(ing =>
      answer.includes(ing) || ing.includes(answer)
    );

    return matched ?? null;

  } catch (error) {
    console.error('Ollama 연결 오류:', error);
    return null;
  }
}
