const OLLAMA_HOST  = process.env.OLLAMA_HOST  ?? 'localhost';
const OLLAMA_PORT  = process.env.OLLAMA_PORT  ?? '11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma3:12b';
const OLLAMA_URL   = `http://${OLLAMA_HOST}:${OLLAMA_PORT}/api/generate`;

export async function matchIngredient(
  productName: string,
  ingredientList: string[]
): Promise<string | null> {
  if (!productName || ingredientList.length === 0) return null;

  const prompt = `다음 의약품 품명을 보고 아래 성분명 목록 중 가장 관련 있는 성분명 하나만 답하세요.
품명이 해당 성분을 포함하거나, 같은 계열의 약품이면 해당 성분명을 선택하세요.
목록에 없으면 "없음"이라고만 답하세요.
다른 설명 없이 성분명 또는 "없음"만 답하세요.

의약품 품명: ${productName}

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
